import { Amount, Box, SignedTransaction } from '@fleet-sdk/common';
import { deserializeTransaction } from '@fleet-sdk/serializer';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { TransactionStatus, TxPot } from '@rosen-bridge/tx-pot';

import { DbService } from './dbService';

export class TxPotService extends AbstractService {
  name = 'TxPotService';
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  private static instance?: TxPotService;

  private constructor(
    private dataSource: DataSource,
    logger?: AbstractLogger,
  ) {
    super(logger);
    TxPot.setup(this.dataSource, this.logger);
  }

  /**
   * initializes the singleton instance of TxPotService
   *
   */
  static init = (dataSource: DataSource, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new TxPotService(dataSource, logger);
  };

  /**
   * returns the singleton instance of TxPotService
   *
   * @static
   * @return {TxPotService}
   * @memberof TxPotService
   */
  static getInstance = (): TxPotService => {
    if (!this.instance) {
      throw new Error('TxPotService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * starts the service. following steps are performed:
   *  - TxPot is setup and Ergo chain is registered
   *  - TxPot update job is executed and scheduled
   *  - service status is set to running
   *
   * @protected
   * @return {Promise<boolean>} true if service started successfully, otherwise
   * false
   * @memberof TxPotService
   */
  protected start = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.running);
    this.logger.info('TxPotService started');
    return true;
  };

  /**
   * stops the service. following steps are performed:
   *  - ths scheduled job is stopped
   *  - service's status is set to dormant
   *
   * @protected
   * @return {Promise<boolean>} true if service stopped successfully, otherwise
   * false
   * @memberof TxPotService
   */
  protected stop = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * Returns the TxPot instance
   * @returns TxPot instance
   */
  getTxPot = (): TxPot => {
    return TxPot.getInstance();
  };

  /**
   * Tracks a box through signed and sent transactions in TxPot to find its
   * latest unspent descendant with the same address.
   *
   * If the box has been spent in a signed or sent transaction, the first
   * unspent output in that transaction sharing the same ergoTree (address) is
   * selected and the process repeats. Returns null when the box is spent but
   * no output with the same address exists in the spending transaction.
   *
   * @param box - The box to track
   * @returns The latest unspent box with the same address, or null if the
   *   chain of spending transactions yields no matching output
   */
  trackToLatestUnspentBox = async (
    box: Box<Amount>,
  ): Promise<Box<Amount> | null> => {
    const txPot = TxPot.getInstance();
    const [signedTxs, sentTxs] = await Promise.all([
      txPot.getTxsByStatus(TransactionStatus.SIGNED),
      txPot.getTxsByStatus(TransactionStatus.SENT),
    ]);

    // Map each input boxId to the spending transaction for O(1) lookup
    const spendingTxByBoxId = new Map<string, SignedTransaction>();
    for (const txEntity of [...signedTxs, ...sentTxs]) {
      const tx = deserializeTransaction<SignedTransaction>(
        Buffer.from(txEntity.serializedTx, 'base64'),
      );
      for (const input of tx.inputs) {
        spendingTxByBoxId.set(input.boxId, tx);
      }
    }

    let current: Box<Amount> = box;

    while (spendingTxByBoxId.has(current.boxId)) {
      const spendingTx = spendingTxByBoxId.get(current.boxId)!;
      const next =
        spendingTx.outputs.find(
          (output) => output.ergoTree === current.ergoTree,
        ) ?? null;

      if (next === null) return null;
      current = next;
    }

    return current;
  };
}
