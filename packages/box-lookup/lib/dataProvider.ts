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
import { DataSource, Repository } from 'typeorm';
import { Request } from './types';

export class DataProvider {
  protected nodeAPI: ReturnType<typeof ergoNodeClientFactory>;
  protected txPot: TxPot;
  protected logger: AbstractLogger;
  protected txPotRepository: Repository<TransactionEntity>;

  constructor(
    protected dataSource: DataSource,
    nodeURL: string,
    logger: AbstractLogger = new DummyLogger(),
  ) {
    this.txPotRepository = this.dataSource.getRepository(TransactionEntity);
    this.txPot = TxPot.setup(dataSource);
    this.nodeAPI = ergoNodeClientFactory(nodeURL);
    this.logger = logger;
  }

  /**
   * Get a encoded transaction and return deserialized
   *
   * @return { Transaction }
   */
  protected deserializeTx = async (tx: TransactionEntity) => {
    try {
      return deserializeTransaction(Buffer.from(tx.serializedTx, 'base64'));
    } catch (err) {
      this.logger.error(
        `Invalid ${tx.txId} tx serialized value: ${tx.serializedTx}`,
      );
      throw err;
    }
  };

  /**
   * This method get all spent & unspent boxes that currently managed by TxPot instance
   *
   * @return { {spentBoxes: string[], unspentBoxes: ErgoBox[], lastStatusUpdate: number} }, spent-box-ids, unspent-boxes, lastStatusUpdate
   */
  public getArrangedTxPotBoxes = async (
    fromTime?: number,
  ): Promise<{
    spentBoxes: string[];
    unspentBoxes: ErgoBox[];
    lastStatusUpdate: number;
  }> => {
    let spentBoxes: string[] = [];
    let unspentBoxes: ErgoBox[] = [];
    const activeTxs = [
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SENT, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.COMPLETED, false)),
    ];

    let lastStatusUpdate = 0;
    for (const tx of activeTxs) {
      if (fromTime != undefined && Number(tx.lastStatusUpdate) < fromTime)
        continue;
      lastStatusUpdate = Math.max(
        lastStatusUpdate,
        Number(tx.lastStatusUpdate),
      );
      const deserializedTx = await this.deserializeTx(tx);
      spentBoxes = spentBoxes.concat(
        ...deserializedTx.inputs.map((input: { boxId: string }) => input.boxId),
      );
      unspentBoxes = unspentBoxes.concat(
        ...deserializedTx.outputs.map((outBox) => {
          return new ErgoBox(outBox as Box);
        }),
      );
    }

    return { spentBoxes, unspentBoxes, lastStatusUpdate };
  };

  /**
   * This method return all spent & unspent boxes that currently placed on the mempool
   *
   * @return { {spentBoxes: string[],  unspentBoxes: ErgoBox[]} }
   */
  protected getArrangedNodeBoxes = async (): Promise<{
    spentBoxes: string[];
    unspentBoxes: ErgoBox[];
  }> => {
    let results;
    let spentBoxes: string[] = [];
    let unspentBoxes: ErgoBox[] = [];
    const offset = 0;
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
    } while (results.length == API_LIMIT);
    return { spentBoxes, unspentBoxes };
  };

  /**
   * Collect unspent Boxes by node & TxPot data
   *
   * @return { string[] }, a Set of box ids
   */
  public getSpentBoxes = async (fromTime?: number): Promise<Set<string>> => {
    const nodeInputBoxesIds = (await this.getArrangedNodeBoxes()).spentBoxes;
    const txPotInputBoxesIds = (await this.getArrangedTxPotBoxes(fromTime))
      .spentBoxes;
    const spentBoxes = new Set<string>([
      ...nodeInputBoxesIds,
      ...txPotInputBoxesIds,
    ]);

    return spentBoxes;
  };

  /**
   * Collect unspent Boxes by node & TxPot data
   *
   * @return { {unspentBoxes: ErgoBox[], lastStatusUpdate: number} }, unspent-boxes, lastStatusUpdate
   */
  public getUnspentBoxes = async (
    requests: Request[],
    fromTime?: number,
  ): Promise<{ unspentBoxes: ErgoBox[]; lastStatusUpdate: number }> => {
    const nodeOutputBoxes = (await this.getArrangedNodeBoxes()).unspentBoxes;
    const txPotBoxesData = await this.getArrangedTxPotBoxes(fromTime);
    const txPotOutputBoxes = txPotBoxesData.unspentBoxes;
    const lastStatusUpdate = txPotBoxesData.lastStatusUpdate;
    const spentBoxes = await this.getSpentBoxes();
    const unspentBoxes: ErgoBox[] = [
      ...nodeOutputBoxes,
      ...txPotOutputBoxes,
    ].filter((val) => val.boxId && !spentBoxes.has(val.boxId));

    return { unspentBoxes, lastStatusUpdate };
  };
}
