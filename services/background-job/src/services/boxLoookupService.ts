import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { BoxLookup } from '@ergo-raffle/box-lookup';
import { Network } from '@fleet-sdk/core';
import { raffleInfo } from '@ergo-raffle/contracts';

import { DbService } from './dbService';
import { TxPotService } from './txPotService';
import { BoxLookupCallbacks } from '../boxLookup/boxLookupCallbacks';
import ErgoNodeNetwork from '../network/ergoNodeNetwork';
import { covertDbBoxesToErgoBoxes as convertDbBoxesToErgoBoxes } from '../boxLookup/utils';
import { CreationRequestEntity } from '../database/entities';
import { ScannerService } from './scannerService';
import { TxType } from '../txPot/types';
import { txpotCallBackGenerator } from '../txPot/callbackGenerator';

export class BoxLookupService extends AbstractService {
  name = 'BoxLookupService';
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: ScannerService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: TxPotService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  private static instance?: BoxLookupService;
  private isJobRunning = false;
  private scheduledJob?: NodeJS.Timeout;
  private continueStop: () => void = () => {
    return;
  };
  private shouldStopJob = false;
  private boxLookup: BoxLookup;
  private updateInterval: number;
  private boxLookupCallbacks: BoxLookupCallbacks;
  private network: ErgoNodeNetwork;
  private activeTxpotCallbackIds: [TxType, string][] = [];

  private constructor(
    updateInterval: number,
    nodeUrl: string,
    networkType: Network,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.boxLookup = new BoxLookup(
      TxPotService.getInstance().getTxPot(),
      nodeUrl,
      networkType,
      logger,
    );
    this.updateInterval = updateInterval;
    this.network = new ErgoNodeNetwork(nodeUrl);
    this.boxLookupCallbacks = new BoxLookupCallbacks(this.network);
  }

  /**
   * Initializes the singleton instance of BoxLookupService
   */
  static init = (
    updateInterval: number,
    nodeUrl: string,
    networkType: Network = Network.Mainnet,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new BoxLookupService(
      updateInterval,
      nodeUrl,
      networkType,
      logger,
    );
  };

  /**
   * Returns the singleton instance of BoxLookupService
   */
  static getInstance = (): BoxLookupService => {
    if (!this.instance) {
      throw new Error('BoxLookupService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * Starts the service: schedules the periodic box lookup job
   */
  protected start = async (): Promise<boolean> => {
    try {
      this.addBaseRequests();
      this.job();
      this.setStatus(ServiceStatus.running);
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the ${this.name}: ${e}`,
      );
      return false;
    }
    return true;
  };

  /**
   * Stops the service: cancels the scheduled job
   */
  protected stop = async (): Promise<boolean> => {
    if (this.isJobRunning) {
      await new Promise<void>((resolve) => {
        this.continueStop = resolve;
        this.shouldStopJob = true;
      });
    }
    this.activeTxpotCallbackIds.forEach(([type, callbackId]) => {
      TxPotService.getInstance().unregisterCompletionCallback(type, callbackId);
    });
    this.activeTxpotCallbackIds = [];
    clearTimeout(this.scheduledJob);
    this.shouldStopJob = false;
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * Executes the box lookup job and schedules its next run
   */
  protected job = async (): Promise<void> => {
    this.isJobRunning = true;
    await this.boxLookup.serveRequests();
    this.scheduledJob = setTimeout(this.job, this.updateInterval * 1000);
    this.isJobRunning = false;
    if (this.shouldStopJob) {
      this.shouldStopJob = false;
      this.continueStop();
    }
  };

  /**
   * Adds a request to the box lookup
   * @param request - The request to add
   */
  private addBaseRequests = () => {
    this.boxLookup.registerRequest({
      address: raffleInfo.addresses.inactiveRaffle,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.boxLookupCallbacks.activationCallback,
      getMinBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getInactiveRaffleBoxes(),
        );
      },
    });
  };

  /**
   * Removes a request from the box lookup
   * @param requestId - The id of the request to remove
   * @param txPotCallbackId - The id of the txpot callback to remove
   * @param proxyAddress - The proxy address of the request to remove
   */
  removeRequest = (
    requestId: number,
    txPotCallbackId: string,
    proxyAddress: string,
  ) => {
    this.boxLookup.unregisterRequest(requestId);

    // Unregister the callback
    TxPotService.getInstance().unregisterCompletionCallback(
      TxType.Creation,
      txPotCallbackId,
    );
    this.activeTxpotCallbackIds = this.activeTxpotCallbackIds.filter(
      ([type, callbackId]) => callbackId !== txPotCallbackId,
    );

    // Remove the proxy address from the scanner
    ScannerService.getInstance().removeDynamicAddress(proxyAddress);
  };

  /**
   * Adds a creation request to the box lookup
   * - Adds the proxy address to the scanner dynamic addresses
   * - Adds the request to the box lookup
   * - Adds the txpot callback
   * @param request - The request to add
   */
  addCreationRequest = (request: CreationRequestEntity) => {
    // Add the proxy address to the scanner
    ScannerService.getInstance().addDynamicAddress(request.proxyAddress);

    // Add the request to the box lookup
    this.boxLookup.registerRequest({
      address: request.proxyAddress,
      value: 10000, // TODO
      tokens: [], // TODO
      onSuffice: this.boxLookupCallbacks.creationCallbackGenerator(request),
      getMinBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getDynamicBoxes(request.proxyAddress),
        );
      },
    });

    // Add the txpot callback
    const callbackId = `${TxType.Creation}-${request.id}`;
    this.activeTxpotCallbackIds.push([TxType.Creation, callbackId]);
    TxPotService.getInstance().registerCompletionCallback(
      TxType.Creation,
      callbackId,
      txpotCallBackGenerator(request.proxyAddress, callbackId, request.id),
    );
  };
}
