import { deserializeTransaction } from '@fleet-sdk/serializer';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  TransactionEntity,
  TransactionStatus,
  TxPot,
} from '@rosen-bridge/tx-pot';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import { Box, ErgoBox } from '@fleet-sdk/core';
import { API_LIMIT } from './constants';

export class DataProvider {
  protected nodeAPI: ReturnType<typeof ergoNodeClientFactory>;
  protected txPot: TxPot;
  protected logger: AbstractLogger;

  constructor(
    txPot: TxPot,
    nodeURL: string,
    logger: AbstractLogger = new DummyLogger(),
  ) {
    this.txPot = txPot;
    this.nodeAPI = ergoNodeClientFactory(nodeURL);
    this.logger = logger;
  }

  /**
   * Fetch TxPot spent boxes by txId
   *
   * @return { string[] }
   */
  protected fetchTxPotInputBoxIds = async (tx: TransactionEntity) => {
    try {
      return deserializeTransaction(
        Buffer.from(tx.serializedTx, 'base64'),
      ).inputs.map((input: { boxId: string }) => input.boxId);
    } catch (err) {
      this.logger.error(
        `Invalid ${tx.txId} tx serialized value: ${tx.serializedTx}`,
      );
      throw err;
    }
  };

  /**
   * Fetch TxPot unspent boxes of a transaction
   *
   * @return { ErgoBox[] }
   */
  protected fetchTxPotOutputBoxes = async (
    tx: TransactionEntity,
  ): Promise<ErgoBox[]> => {
    try {
      return deserializeTransaction(
        Buffer.from(tx.serializedTx, 'base64'),
      ).outputs.map((outBox) => {
        return new ErgoBox(outBox as Box);
      });
    } catch (err) {
      this.logger.error(
        `Invalid ${tx.txId} tx serialized value: ${tx.serializedTx}`,
      );
    }
    return [];
  };

  /**
   * This method get all spent & unspent boxes that currently managed by TxPot instance
   *
   * @return { [string[],  ErgoBox[]] }
   */
  protected getArrangedTxPotBoxes = async (): Promise<
    [string[], ErgoBox[]]
  > => {
    let spentBoxes: string[] = [];
    let unspentBoxes: ErgoBox[] = [];
    const activeTxs = [
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SENT, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.COMPLETED, false)),
    ];

    for (const tx of activeTxs) {
      spentBoxes = spentBoxes.concat(...(await this.fetchTxPotInputBoxIds(tx)));
      unspentBoxes = unspentBoxes.concat(
        ...(await this.fetchTxPotOutputBoxes(tx)),
      );
    }

    return [spentBoxes, unspentBoxes];
  };

  /**
   * This method return all spent & unspent boxes that currently placed on the mempool
   *
   * @return { [string[],  ErgoBox[]] }
   */
  protected getArrangedNodeBoxes = async (): Promise<[string[], ErgoBox[]]> => {
    let results;
    let spentBoxes: string[] = [];
    let unspentBoxes: ErgoBox[] = [];
    let offset = 0;
    do {
      results = await this.nodeAPI.getUnconfirmedTransactions({
        limit: API_LIMIT,
        offset: offset,
      });
      for (const tx of results) {
        spentBoxes = spentBoxes.concat(
          ...tx.inputs.map((input: { boxId: string }) => input.boxId),
        );
        unspentBoxes = unspentBoxes.concat(
          ...tx.outputs.map(
            (output) =>
              new ErgoBox({
                ...output,
                assets: output.assets ?? [],
                boxId: output.boxId ?? '',
                index: output.index ?? 0,
                transactionId: output.transactionId ?? '',
              }),
          ),
        );
      }
      offset += API_LIMIT;
    } while (results.length == API_LIMIT);
    return [spentBoxes, unspentBoxes];
  };

  /**
   * Collect unspent Boxes by node & TxPot data
   *
   * @return a Set of box ids
   */
  public getSpentBoxes = async (): Promise<Set<string>> => {
    const [nodeInputBoxesIds] = await this.getArrangedNodeBoxes();
    const [txPotInputBoxesIds] = await this.getArrangedTxPotBoxes();
    const spentBoxes = new Set<string>([
      ...nodeInputBoxesIds,
      ...txPotInputBoxesIds,
    ]);

    return spentBoxes;
  };

  /**
   * Collect unspent Boxes by node & TxPot data
   *
   * @return
   */
  public getUnspentBoxes = async (): Promise<ErgoBox[]> => {
    const [, nodeOutputBoxes] = await this.getArrangedNodeBoxes();
    const [, txPotOutputBoxes] = await this.getArrangedTxPotBoxes();
    const spentBoxes = await this.getSpentBoxes();
    const unspentBoxes: ErgoBox[] = [
      ...nodeOutputBoxes,
      ...txPotOutputBoxes,
      // To Do: ...this.extraUnspentBoxes,
    ].filter((val) => val.boxId && !spentBoxes.has(val.boxId));

    return unspentBoxes;
  };
}
