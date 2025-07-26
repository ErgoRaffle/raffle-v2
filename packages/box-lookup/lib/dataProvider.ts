import { ErgoBox } from '@fleet-sdk/core';
import { deserializeTransaction } from '@fleet-sdk/serializer';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  TransactionEntity,
  TransactionStatus,
  TxPot,
} from '@rosen-bridge/tx-pot';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';
import { DataSource, Repository } from 'typeorm';
import { API_LIMIT } from './constants';
import { Request } from './types';

/**
 * DataProvider is responsible for interacting with both Ergo node and TxPot.
 * It fetches, deserializes, and filters unspent and spent boxes to support transaction building.
 */
export class DataProvider {
  protected nodeAPI: ReturnType<typeof ergoNodeClientFactory>;
  protected txPotRepository: Repository<TransactionEntity>;
  protected txPot: TxPot;
  protected logger: AbstractLogger;
  public lastTxPotStatusUpdate = 0;

  constructor(
    protected dataSource: DataSource,
    protected nodeURL: string,
    logger: AbstractLogger = new DummyLogger(),
  ) {
    this.nodeAPI = ergoNodeClientFactory(nodeURL);
    this.txPot = TxPot.setup(dataSource);
    this.txPotRepository = dataSource.getRepository(TransactionEntity);
    this.logger = logger;
  }

  /**
   * Deserializes a base64-encoded serialized transaction.
   * Logs an error if deserialization fails.
   * @param tx Transaction entity from TxPot
   * @returns Deserialized transaction object
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
   * Retrieves and arranges all unconfirmed transactions from the node,
   * and extracts their input/output boxes.
   * @returns Object with spentBoxes and unspentBoxes
   */
  protected getArrangedNodeBoxes = async (): Promise<{
    spentBoxes: string[];
    unspentBoxes: ErgoBox[];
  }> => {
    const txs = [];
    let results;
    let offset = 0;
    do {
      results = await this.nodeAPI.getUnconfirmedTransactions({
        limit: API_LIMIT,
        offset,
      });
      txs.push(...results);
      offset += API_LIMIT;
    } while (results.length === API_LIMIT);
    const spentBoxes = txs.map((tx) => tx.inputs.map((ib) => ib.boxId)).flat();
    const unspentBoxes = txs
      .map((tx) =>
        tx.outputs.map(
          (ob, index) =>
            new ErgoBox({
              ...ob,
              assets: ob.assets ?? [],
              boxId: ob.boxId!,
              index: index,
              transactionId: tx.id!,
            }),
        ),
      )
      .flat();
    return {
      spentBoxes,
      unspentBoxes,
    };
  };

  /**
   * Retrieves recent signed/sent/completed transactions from TxPot,
   * deserializes them, and extracts their boxes.
   * Only includes transactions updated after the last known time.
   * @returns Object with spentBoxes and unspentBoxes
   */
  public getArrangedTxPotBoxes = async (): Promise<{
    spentBoxes: string[];
    unspentBoxes: ErgoBox[];
  }> => {
    const fromTime = this.lastTxPotStatusUpdate;
    const txs = (
      await Promise.all([
        this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false),
        this.txPot.getTxsByStatus(TransactionStatus.SENT, false),
        this.txPot.getTxsByStatus(TransactionStatus.COMPLETED, false),
      ])
    ).flat();
    this.lastTxPotStatusUpdate = 0;

    const spent: string[] = [],
      unspent: ErgoBox[] = [];
    let i = 0;
    for (const tx of txs) {
      if (fromTime && Number(tx.lastStatusUpdate) < fromTime) continue;
      this.lastTxPotStatusUpdate = Math.max(
        this.lastTxPotStatusUpdate,
        Number(tx.lastStatusUpdate),
      );
      const deserialized = await this.deserializeTx(tx);
      spent.push(...deserialized.inputs.map((i) => i.boxId));
      unspent.push(
        ...deserialized.outputs.map(
          (o) =>
            new ErgoBox({
              ...o,
              boxId: o.boxId!,
              transactionId: tx.txId,
              index: i,
            }),
        ),
      );
      i++;
    }

    return { spentBoxes: spent, unspentBoxes: unspent };
  };

  /**
   * Returns a combined Set of all known spent boxIds from both node and TxPot.
   */
  public getSpentBoxes = async (): Promise<Set<string>> => {
    const [node, txPot] = await Promise.all([
      this.getArrangedNodeBoxes(),
      this.getArrangedTxPotBoxes(),
    ]);
    return new Set([...node.spentBoxes, ...txPot.spentBoxes]);
  };

  /**
   * Returns unspent boxes from both node and TxPot that are not in the spent set.
   */
  public getUnspentBoxes = async (): Promise<ErgoBox[]> => {
    const [node, txPot, spent] = await Promise.all([
      this.getArrangedNodeBoxes(),
      this.getArrangedTxPotBoxes(),
      this.getSpentBoxes(),
    ]);
    return [...node.unspentBoxes, ...txPot.unspentBoxes].filter(
      (box) => box.boxId && !spent.has(box.boxId),
    );
  };

  /**
   * Returns filtered unspent boxes for the given request,
   * excluding those that are already spent or included in in-flight transactions.
   * @param request Request object implementing `getMinedUnspentBoxes`
   * @returns unspentBoxes for general usage, and filtered request-specific unspentBoxes
   */
  public update = async (
    request: Request,
  ): Promise<{ unspentBoxes: ErgoBox[]; requestUnspentBoxes: ErgoBox[] }> => {
    const [baseUnspent, txPotExtra, spent] = await Promise.all([
      this.getUnspentBoxes(),
      this.getArrangedTxPotBoxes(),
      this.getSpentBoxes(),
    ]);

    const unspentBoxes = [...baseUnspent, ...txPotExtra.unspentBoxes].filter(
      (box) => box.boxId && !spent.has(box.boxId),
    );

    const requestUnspentBoxes = (await request.getMinedUnspentBoxes()).filter(
      (box) => box.boxId && !spent.has(box.boxId),
    );

    return { unspentBoxes, requestUnspentBoxes };
  };
}
