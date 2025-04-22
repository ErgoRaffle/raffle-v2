import {
  TransactionEntity,
  TransactionStatus,
  TxPot,
} from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';

import { Request } from './types/request';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected spentBoxes: Set<string> = new Set<string>();
  protected nodeAPI;
  protected requests = new Map<number, Request>();

  constructor(
    protected txPot: TxPot,
    nodeURL: string,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {
    this.nodeAPI = ergoNodeClientFactory(nodeURL);
  }

  /**
   * register a new lookup request and return its assigned ID
   * @param request
   * @returns {number}
   */
  readonly registerRequest = (request: Request) => {
    this.requests.set(++this.requestsIdCounter, request);
    this.logger.info(
      `New BoxLookupRequest registered by ${this.requestsIdCounter} id`,
    );
    return this.requestsIdCounter;
  };

  /**
   * unregister request by related request-id if exists
   * @param requestId
   * @returns {Request | undefined}
   */
  readonly unregisterRequest = (requestId: number) => {
    if (this.requests.has(requestId)) {
      const request = this.requests.get(requestId);
      this.logger.info(`A BoxLookupRequest unregistered by ${requestId} id`);
      this.requests.delete(requestId);
      return request;
    }
    this.logger.info(
      `Tried to unregistered a BoxLookupRequest by ${requestId} id that not exists`,
    );
    return undefined;
  };

  /**
   * This method get all spent boxes that currently placed on the mempool
   *
   * @return { string[] }
   */
  protected readonly getNodeSpentBoxes = async () => {
    let results;
    let unspentBoxes: string[] = [];
    let offset = 0;
    do {
      results = await this.nodeAPI.getUnconfirmedTransactions({
        limit: 100,
        offset: offset,
      });
      for (const tx of results)
        unspentBoxes = unspentBoxes.concat(
          ...tx.inputs.map((input: { boxId: string }) => input.boxId),
        );
      offset += 100;
    } while (results.length == 100);
    return unspentBoxes;
  };

  /**
   * Fetch TxPot spent boxes by txId
   *
   * @return { string[] }
   */
  protected readonly fetchTxPotInputBoxIds = async (tx: TransactionEntity) => {
    try {
      return JSON.parse(tx.serializedTx).inputs.map(
        (input: { boxId: string }) => input.boxId,
      );
    } catch (err) {
      this.logger.error(
        `Invalid ${tx.txId} tx serialized value: ${tx.serializedTx}`,
      );
    }
    return [];
  };

  /**
   * This method get all spent boxes that currently managed by TxPot instance
   *
   * @return { string[] }
   */
  protected readonly getTxPotSpentBoxes = async () => {
    let unspentBoxes: string[] = [];
    const activeTxs = [
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SENT, false)),
      ...(await this.txPot.getTxsByStatus(TransactionStatus.COMPLETED, false)),
    ];

    for (const tx of activeTxs) {
      unspentBoxes = unspentBoxes.concat(
        ...(await this.fetchTxPotInputBoxIds(tx)),
      );
    }

    return unspentBoxes;
  };

  /**
   * update SpentBoxes list for boxes by node & TxPot data
   *
   * @return
   */
  protected readonly updateSpentBoxesList = async () => {
    this.spentBoxes = new Set<string>([
      ...(await this.getNodeSpentBoxes()),
      ...(await this.getTxPotSpentBoxes()),
    ]);
  };

  /**
   * return latest value of the spentBoxes
   *
   * @returns { string[] }
   */
  public getSpentBoxesList = () => this.spentBoxes;
}
