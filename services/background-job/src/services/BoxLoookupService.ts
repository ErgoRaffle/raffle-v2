import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { BoxLookup } from '@ergo-raffle/box-lookup';
import { Network } from '@fleet-sdk/core';
import { raffleInfo } from '@ergo-raffle/contracts';

import { DbService } from './DbService';
import { TxPotService } from './TxPotService';
import { BoxLookupCallbacks } from '../boxLookup/BoxLookupCallbacks';
import ErgoNodeNetwork from '../network/ErgoNodeNetwork';
import { covertDbBoxesToErgoBoxes } from '../boxLookup/utils';

export class BoxLookupService extends AbstractService {
  name = 'BoxLookupService';
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
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
    this.boxLookupCallbacks = new BoxLookupCallbacks(
      this.network,
      TxPotService.getInstance().getTxPot(),
    );
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
      this.addRequests();
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
  addRequests = () => {
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
        return covertDbBoxesToErgoBoxes(
          await DbService.getInstance().getInactiveRaffleBoxes(),
        );
      },
    });
  };
}
