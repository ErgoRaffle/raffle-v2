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
  public lastTxPotStatusUpdate: number = 0;

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
   * @return { {spentBoxes: string[], unspentBoxes: ErgoBox[]} }, spent-box-ids, unspent-boxes
   */
  public getArrangedTxPotBoxes = async (): Promise<{
    spentBoxes: string[];
    unspentBoxes: ErgoBox[];
  }> => {
    let spentBoxes: string[] = [];
    let unspentBoxes: ErgoBox[] = [];
    const fromTime = this.lastTxPotStatusUpdate;
    const activeTxs = [
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SENT, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.COMPLETED, false)),
    ];

    this.lastTxPotStatusUpdate = 0;
    for (const tx of activeTxs) {
      if (fromTime != undefined && Number(tx.lastStatusUpdate) < fromTime)
        continue;
      this.lastTxPotStatusUpdate = Math.max(
        this.lastTxPotStatusUpdate,
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

    return { spentBoxes, unspentBoxes };
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
  public getSpentBoxes = async (): Promise<Set<string>> => {
    const nodeInputBoxesIds = (await this.getArrangedNodeBoxes()).spentBoxes;
    const txPotInputBoxesIds = (await this.getArrangedTxPotBoxes()).spentBoxes;
    const spentBoxes = new Set<string>([
      ...nodeInputBoxesIds,
      ...txPotInputBoxesIds,
    ]);

    return spentBoxes;
  };

  /**
   * Collect unspent Boxes by node & TxPot data
   *
   * @return { ErgoBox[] } unspent-boxes
   */
  public getUnspentBoxes = async (): Promise<ErgoBox[]> => {
    const nodeOutputBoxes = (await this.getArrangedNodeBoxes()).unspentBoxes;
    const txPotBoxesData = await this.getArrangedTxPotBoxes();
    const txPotOutputBoxes = txPotBoxesData.unspentBoxes;
    const spentBoxes = await this.getSpentBoxes();
    const unspentBoxes: ErgoBox[] = [
      ...nodeOutputBoxes,
      ...txPotOutputBoxes,
    ].filter((val) => val.boxId && !spentBoxes.has(val.boxId));

    return unspentBoxes;
  };

  /**
   * Returns filtered unspent boxes, excluding those already spent.
   *
   * Combines internal and request-specific boxes, removing spent ones.
   *
   * @param request
   * @returns { unspentBoxes: ErgoBox[], requestUnspentBoxes: ErgoBox[] }
   */
  public update = async (
    request: Request,
  ): Promise<{ unspentBoxes: ErgoBox[]; requestUnspentBoxes: ErgoBox[] }> => {
    let unspentBoxes = await this.getUnspentBoxes();
    unspentBoxes = unspentBoxes.concat(
      (await this.getArrangedTxPotBoxes()).unspentBoxes,
    );
    const totalSpentBoxes = await this.getSpentBoxes();
    unspentBoxes = unspentBoxes.filter((val) => {
      return val.boxId && !totalSpentBoxes.has(val.boxId);
    });

    const requestUnspentBoxes = (await request.getMinedUnspentBoxes()).filter(
      (val) => {
        return val.boxId && !totalSpentBoxes.has(val.boxId);
      },
    );

    return {
      unspentBoxes,
      requestUnspentBoxes,
    };
  };
}
