import {
  TransactionEntity,
  TransactionStatus,
  TxPot,
} from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import { ErgoTransactionOutput } from '@rosen-clients/ergo-node';

import { API_LIMIT } from './constants';
import { OutputBox, RoundState, DeserializeTx } from './types';

export class DataProvider {
  private nodeAPI;
  private currentRoundState: RoundState = {
    spentBoxIds: new Set<string>(),
    unspentBoxes: [],
  };

  constructor(
    private txPot: TxPot,
    nodeURL: string,
    private deserializeTx: DeserializeTx,
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
    this.logger.debug('Updating round state with TxPot data');

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

    this.logger.debug(
      `Round updated with ${txPotSpentBoxIds.length} additional spent boxes and ${newUnspentBoxes.length} new unspent boxes from TxPot`,
    );
  };

  /**
   * Get current round state for debugging purposes
   * @returns Current round state
   */
  getCurrentRoundState = (): RoundState => {
    this.logger.debug(
      `Current round state unspent box ids: [${this.currentRoundState.unspentBoxes.map(
        (box) => box.boxId,
      )}]`,
    );
    this.logger.debug(
      `Current round state spent box ids: [${Array.from(
        this.currentRoundState.spentBoxIds,
      )}]`,
    );
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
   * Convert a node output to an OutputBox
   * @param output - The node output
   * @returns The OutputBox
   */
  private convertToOutputBox = (output: ErgoTransactionOutput): OutputBox => {
    const { assets, boxId, transactionId, index, ...rest } = output;
    return {
      ...rest,
      boxId: boxId ?? '',
      transactionId: transactionId ?? '',
      index: index ?? 0,
      assets: assets ?? [],
    };
  };

  /**
   * Get all spent & unspent boxes that currently placed on the mempool
   * @returns Tuple of [spentBoxIds, unspentBoxes]
   */
  private getArrangedNodeBoxes = async (): Promise<[string[], OutputBox[]]> => {
    const spentBoxIds: string[] = [];
    const unspentBoxes: OutputBox[] = [];
    const txIterator = this.getMempoolTxIterator();

    for await (const tx of txIterator) {
      spentBoxIds.push(
        ...tx.inputs.map((input: { boxId: string }) => input.boxId),
      );
      unspentBoxes.push(...tx.outputs.map(this.convertToOutputBox));
    }

    return [spentBoxIds, unspentBoxes];
  };

  /**
   * Deserializes a TxPot transaction entity using the injected deserializer.
   * Logs an error if deserialization fails.
   * @param tx Transaction entity from TxPot
   * @returns Deserialized transaction object
   */
  private safeDeserializeTx = (tx: TransactionEntity) => {
    try {
      return this.deserializeTx(tx);
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
  private getArrangedTxPotBoxes = async (): Promise<
    [string[], OutputBox[]]
  > => {
    const spentBoxIds: string[] = [];
    const unspentBoxes: OutputBox[] = [];

    const activeTxs = [
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SENT, false)),
    ].map(this.safeDeserializeTx);

    this.logger.debug(
      `Processing active txs in txpot: [${activeTxs.map((tx) => tx.id)}]`,
    );

    for (const tx of activeTxs) {
      spentBoxIds.push(
        ...tx.inputs.map((input: { boxId: string }) => input.boxId),
      );
      unspentBoxes.push(...tx.outputs);
    }

    return [spentBoxIds, unspentBoxes];
  };
}
