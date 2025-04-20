import { TransactionStatus, TxPot } from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { Axios } from 'axios';

import { Request } from './types/request';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected spentBoxes: string[] = [];
  protected nodeAPI: Axios;
  protected requests = new Map<number, Request>();

  constructor(
    protected txPot: TxPot,
    nodeURL: string,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {
    this.nodeAPI = new Axios({ baseURL: nodeURL });
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
      results = await this.nodeAPI.get('/transactions/unconfirmed', {
        params: { limit: 100, offset: offset },
      });
      for (const tx of results.data)
        unspentBoxes = unspentBoxes.concat(
          ...tx.inputs.map((input: { boxId: string }) => input.boxId),
        );
      offset += 100;
    } while (results.status == 200 && results.data.length == 100);
    return unspentBoxes;
  };

  /**
   * Fetch TxPot spent boxes by txId
   *
   * @return { string[] }
   */
  protected readonly fetchTxPotBoxes = async (txId: string) => {
    const results = await this.nodeAPI.get(
      `/transactions/unconfirmed/byTransactionId/${txId}`,
    );
    if (results.status == 200)
      return results.data.inputs.map((input: { boxId: string }) => input.boxId);
    return [];
  };

  /**
   * This method get all spent boxes that currently managed by TxPot instance
   *
   * @return { string[] }
   */
  protected readonly getTxPotSpentBoxes = async () => {
    let unspentBoxes: string[] = [];
    let txs = await this.txPot.getTxsByStatus(TransactionStatus.SIGNED, false);
    txs = txs.concat(
      ...(await this.txPot.getTxsByStatus(TransactionStatus.SENT, false)),
    );
    txs = txs.concat(
      ...(await this.txPot.getTxsByStatus(TransactionStatus.COMPLETED, false)),
    );
    for (const tx of txs) {
      unspentBoxes = unspentBoxes.concat(
        ...(await this.fetchTxPotBoxes(tx.txId)),
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
    this.spentBoxes = await this.getNodeSpentBoxes();
    this.spentBoxes = this.spentBoxes.concat(
      ...(await this.getTxPotSpentBoxes()).filter(
        (boxId) => this.spentBoxes.indexOf(boxId) < 0,
      ),
    );
  };

  /**
   * return latest value of the spentBoxes
   *
   * @returns { string[] }
   */
  public getSpentBoxesList = () => this.spentBoxes;
}
