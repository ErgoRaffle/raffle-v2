import {
  TransactionEntity,
  TransactionStatus,
  TxPot,
} from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import { deserializeTransaction } from '@fleet-sdk/serializer';
import { ErgoTransactionOutput } from '@rosen-clients/ergo-node';
import { Box, ErgoBox } from '@fleet-sdk/core';

import { API_LIMIT } from './constants';

export interface RoundState {
  spentBoxIds: Set<string>;
  unspentBoxes: ErgoBox[];
}

export class DataProvider {
  private nodeAPI;
  private currentRoundState: RoundState = {
    spentBoxIds: new Set<string>(),
    unspentBoxes: [],
  };

  constructor(
    private txPot: TxPot,
    nodeURL: string,
    private logger: AbstractLogger = new DummyLogger(),
  ) {
    this.nodeAPI = ergoNodeClientFactory(nodeURL);
  }

  /**
   * Start a new round by fetching data from mempool (node)
   * This should be called at the beginning of each round
   */
  startNewRound = async (): Promise<void> => {
    this.logger.info('Starting new round - fetching data from mempool');

    // Reset state for new round
    this.currentRoundState = {
      spentBoxIds: new Set<string>(),
      unspentBoxes: [],
    };

    // Fetch data from mempool
    const [spentBoxIds, unspentBoxes] = await this.getArrangedNodeBoxes();

    // Update state with mempool data
    this.currentRoundState.spentBoxIds = new Set(spentBoxIds);
    this.currentRoundState.unspentBoxes = unspentBoxes;

    this.logger.info(
      `New round started with ${spentBoxIds.length} spent boxes and ${unspentBoxes.length} unspent boxes from mempool`,
    );
  };

  /**
   * Update state in the middle of a round using txpot boxes
   * This should be called during the round to update with txpot data
   */
  updateRoundWithTxPotData = async (): Promise<void> => {
    this.logger.info('Updating round state with TxPot data');

    const [txPotSpentBoxIds, txPotUnspentBoxes] =
      await this.getArrangedTxPotBoxes();

    // Add txpot spent boxes to current state
    txPotSpentBoxIds.forEach((boxId) => {
      this.currentRoundState.spentBoxIds.add(boxId);
    });

    // Filter out spent boxes from the new unspent txpot boxes
    const newUnspentBoxes = txPotUnspentBoxes.filter(
      (box) => !this.currentRoundState.spentBoxIds.has(box.boxId),
    );
    const newUnspentBoxIds = new Set(newUnspentBoxes.map((box) => box.boxId));

    // Filter out spent boxes and duplicates from the current unspent boxes
    this.currentRoundState.unspentBoxes =
      this.currentRoundState.unspentBoxes.filter(
        (box) =>
          !this.currentRoundState.spentBoxIds.has(box.boxId) &&
          !newUnspentBoxIds.has(box.boxId),
      );
    this.currentRoundState.unspentBoxes.push(...newUnspentBoxes);

    this.logger.info(
      `Round updated with ${txPotSpentBoxIds.length} additional spent boxes and ${newUnspentBoxes.length} new unspent boxes from TxPot`,
    );
  };

  /**
   * Get current round state for debugging purposes
   * @returns Current round state
   */
  getCurrentRoundState = (): RoundState => {
    return {
      spentBoxIds: new Set(this.currentRoundState.spentBoxIds),
      unspentBoxes: [...this.currentRoundState.unspentBoxes],
    };
  };

  /**
   * get a mempool tx in each iteration until there are no more txs in it
   */
  private async *getMempoolTxIterator() {
    let currentPage = 0;

    while (true) {
      const txsPage = await this.nodeAPI.getUnconfirmedTransactions({
        offset: currentPage * API_LIMIT,
        limit: API_LIMIT,
      });

      if (txsPage.length) {
        yield* txsPage;
        currentPage += 1;
      } else {
        return;
      }
    }
  }

  /**
   * Convert a node output to an ErgoBox
   * @param output - The node output
   * @returns The ErgoBox
   */
  private convertToErgoBox = (output: ErgoTransactionOutput): ErgoBox => {
    return new ErgoBox({
      ...output,
      assets: output.assets ?? [],
      boxId: output.boxId ?? '',
      index: output.index ?? 0,
      transactionId: output.transactionId ?? '',
    });
  };

  /**
   * Get all spent & unspent boxes that currently placed on the mempool
   * @returns Tuple of [spentBoxIds, unspentBoxes]
   */
  private getArrangedNodeBoxes = async (): Promise<[string[], ErgoBox[]]> => {
    const spentBoxIds: string[] = [];
    const unspentBoxes: ErgoBox[] = [];
    const txIterator = this.getMempoolTxIterator();

    for await (const tx of txIterator) {
      spentBoxIds.push(
        ...tx.inputs.map((input: { boxId: string }) => input.boxId),
      );
      unspentBoxes.push(...tx.outputs.map(this.convertToErgoBox));
    }

    return [spentBoxIds, unspentBoxes];
  };

  /**
   * Deserializes a base64-encoded serialized transaction.
   * Logs an error if deserialization fails.
   * @param tx Transaction entity from TxPot
   * @returns Deserialized transaction object
   */
  private deserializeTx = (tx: TransactionEntity) => {
    try {
      return deserializeTransaction(Buffer.from(tx.serializedTx, 'hex'));
    } catch (err) {
      this.logger.error(
        `Invalid ${tx.txId} tx serialized value: ${tx.serializedTx}`,
      );
      throw err;
    }
  };

  /**
   * Get all spent & unspent boxes that currently managed by TxPot instance
   * @returns Tuple of [spentBoxIds, unspentBoxes]
   */
  private getArrangedTxPotBoxes = async (): Promise<[string[], ErgoBox[]]> => {
    const spentBoxIds: string[] = [];
    const unspentBoxes: ErgoBox[] = [];

    const activeTxs = [
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SENT, false)),
    ].map(this.deserializeTx);

    for (const tx of activeTxs) {
      spentBoxIds.push(
        ...tx.inputs.map((input: { boxId: string }) => input.boxId),
      );
      /**
       * We know that the outputs are type of Box<bigint> because the transaction is signed
       */
      unspentBoxes.push(
        ...tx.outputs.map((box) => new ErgoBox(box as Box<bigint>)),
      );
    }

    return [spentBoxIds, unspentBoxes];
  };
}
