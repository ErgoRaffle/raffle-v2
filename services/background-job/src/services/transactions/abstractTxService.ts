import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { CallbackFunction, TransactionEntity } from '@rosen-bridge/tx-pot';
import { ErgoAddress } from '@fleet-sdk/core';

import { BoxLookupService } from '../boxLoookupService';
import { ScannerService } from '../scannerService';
import { TxPotService } from '../txPotService';
import ErgoNodeNetwork from '../../network/ergoNodeNetwork';
import { TxType } from '../../transactions/types';
import { deserializeTransaction } from '@fleet-sdk/serializer';

export abstract class AbstractTxService extends AbstractService {
  protected dependencies: Dependency[] = [
    {
      serviceName: ScannerService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: BoxLookupService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: TxPotService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  protected network: ErgoNodeNetwork;
  protected activeTxpotCallbackIds: [TxType, string][] = [];
  protected activeBoxLookupRequestIds: number[] = [];
  protected activeProxyAddresses: string[] = [];
  protected static instance: AbstractTxService;

  constructor(nodeUrl: string, logger: AbstractLogger) {
    super(logger);
    this.network = new ErgoNodeNetwork(nodeUrl);
  }

  static getInstance = (): AbstractTxService => {
    if (!AbstractTxService.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return AbstractTxService.instance;
  };

  /**
   * Add the base box-lookup requests to the service
   */
  abstract addBaseRequests(): void;

  /**
   * Start the service
   */
  protected start = async (): Promise<boolean> => {
    this.addBaseRequests();
    this.setStatus(ServiceStatus.running);
    return true;
  };

  /**
   * Removing all the active requests and callbacks and stop the service
   */
  protected stop = async (): Promise<boolean> => {
    // Unregister the txpot callbacks
    this.activeTxpotCallbackIds.forEach(([txType, callbackId]) => {
      TxPotService.getInstance().unregisterCompletionCallback(
        txType,
        callbackId,
      );
    });
    this.activeTxpotCallbackIds = [];

    // Remove the box lookup requests
    this.activeBoxLookupRequestIds.forEach((requestId) => {
      BoxLookupService.getInstance().removeRequest(requestId);
    });
    this.activeBoxLookupRequestIds = [];

    // Remove the proxy addresses
    this.activeProxyAddresses.forEach((proxyAddress) => {
      ScannerService.getInstance().removeDynamicAddress(proxyAddress);
    });
    this.activeProxyAddresses = [];

    // Set the status to dormant
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * Finish a request
   * - Remove the request from the box lookup
   * - Unregister the txpot callback
   * - Remove the proxy address from the scanner
   * @param requestId - The box-lookup request id
   * @param callbackId - The txpot callback id
   * @param txType - The transaction type
   * @param proxyAddress - The proxy address
   */
  finishRequest = (
    requestId: number,
    callbackId: string,
    txType: TxType,
    proxyAddress: string,
  ): void => {
    this.logger.debug(
      `Finishing box-lookup request with id [${requestId}] and txpot callback id [${callbackId}] and proxy address [${proxyAddress}]`,
    );
    BoxLookupService.getInstance().removeRequest(requestId);
    this.activeBoxLookupRequestIds = this.activeBoxLookupRequestIds.filter(
      (id) => id !== requestId,
    );

    TxPotService.getInstance().unregisterCompletionCallback(txType, callbackId);
    this.activeTxpotCallbackIds = this.activeTxpotCallbackIds.filter(
      ([txType, callbackId]) => callbackId !== callbackId,
    );

    ScannerService.getInstance().removeDynamicAddress(proxyAddress);
    this.activeProxyAddresses = this.activeProxyAddresses.filter(
      (address) => address !== proxyAddress,
    );
  };

  /**
   * Generates a callback function to complete a transaction
   * @param proxyAddress - The proxy address
   * @param requestId - The box-lookup request id
   * @param callbackId - The txpot callback id
   * @param txType - The transaction type
   * @returns A callback function to complete a transaction
   */
  txpotCallBackGenerator = (
    proxyAddress: string,
    requestId: number,
    callbackId: string,
    txType: TxType,
  ): CallbackFunction => {
    return async (txEntity: TransactionEntity) => {
      const tx = deserializeTransaction(
        Buffer.from(txEntity.serializedTx, 'hex'),
      );
      if (
        tx.outputs.find(
          (output) =>
            output.ergoTree === ErgoAddress.fromBase58(proxyAddress).ergoTree,
        )
      ) {
        this.logger.info(
          `Transaction ${txEntity.txId} is completed for request ${requestId}`,
        );
        this.finishRequest(requestId, callbackId, txType, proxyAddress);
        return;
      }
    };
  };
}
