import {
  TransactionEntity,
  TransactionStatus,
  TxPot,
} from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory, {
  ErgoTransactionOutput,
} from '@rosen-clients/ergo-node';

import { Request } from './types/request';
import { API_LIMIT } from './constants';
import { ErgoAddress, Network } from '@fleet-sdk/core';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected spentBoxes: Set<string> = new Set<string>();
  protected unspentBoxes: ErgoTransactionOutput[] = [];
  protected alreadySelectedUnspentBoxIds: Set<string> = new Set<string>();
  protected nodeAPI;
  protected requests = new Map<number, Request>();
  protected intervalAsSecond: number;
  protected running = false;
  protected latestTimeout: ReturnType<typeof setTimeout>;

  constructor(
    protected txPot: TxPot,
    nodeURL: string,
    protected networkType: Network,
    intervalAsSecond: number,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {
    this.nodeAPI = ergoNodeClientFactory(nodeURL);
    this.intervalAsSecond = intervalAsSecond;
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
   * This method return all spent & unspent boxes that currently placed on the mempool
   *
   * @return { [string[],  ErgoTransactionOutput[]] }
   */
  protected readonly getArrangedNodeBoxes = async (): Promise<
    [string[], ErgoTransactionOutput[]]
  > => {
    let results;
    let spentBoxes: string[] = [];
    let unspentBoxes: ErgoTransactionOutput[] = [];
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
        unspentBoxes = unspentBoxes.concat(...tx.outputs);
      }
      offset += API_LIMIT;
    } while (results.length == API_LIMIT);
    return [spentBoxes, unspentBoxes];
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
   * Fetch TxPot spent boxes of a transaction
   *
   * @return { string[] }
   */
  protected readonly fetchTxPotOutputBoxes = async (tx: TransactionEntity) => {
    try {
      return JSON.parse(tx.serializedTx).outputs;
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
   * @return { [string[],  ErgoTransactionOutput[]] }
   */
  protected readonly getArrangedTxPotBoxes = async (): Promise<
    [string[], ErgoTransactionOutput[]]
  > => {
    let spentBoxes: string[] = [];
    let unspentBoxes: ErgoTransactionOutput[] = [];
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
   * update Spent & unspent Boxes lists by node & TxPot data
   *
   * @return
   */
  protected updateBoxesLists = async () => {
    const [nodeInputBoxesIds, nodeOutputBoxes] =
      await this.getArrangedNodeBoxes();
    const [txPotInputBoxesIds, txPotOutputBoxes] =
      await this.getArrangedTxPotBoxes();
    this.spentBoxes = new Set<string>([
      ...nodeInputBoxesIds,
      ...txPotInputBoxesIds,
    ]);
    this.unspentBoxes = [...nodeOutputBoxes, ...txPotOutputBoxes].filter(
      (val) => val.boxId && Array.from(this.spentBoxes).indexOf(val.boxId) < 0,
    );

    // remove unavailable unspent-boxes to reduce memory usage
    for (const alreadyUnspentBox of this.alreadySelectedUnspentBoxIds) {
      if (
        this.unspentBoxes.map((box) => box.boxId).indexOf(alreadyUnspentBox) < 0
      )
        this.alreadySelectedUnspentBoxIds.delete(alreadyUnspentBox);
    }
  };

  /**
   * return latest values of the spentBoxes ids
   *
   * @returns { string[] }
   */
  public getSpentBoxesList = () => this.spentBoxes;

  /**
   * return latest values of the unspentBoxes
   *
   * @returns { ErgoTransactionOutput[] }
   */
  public getUnspentBoxesList = () => this.unspentBoxes;

  /**
   * start the process of observing unspent boxes
   *
   * @returns
   */
  public start = async () => {
    if (this.running || this.requests.size === 0) return;
    this.running = true;
    await this.serveRequests();
  };

  /**
   * Updates the list of unspent boxes and serves pending requests
   *
   * @returns
   */
  protected serveRequests = async () => {
    await this.updateBoxesLists();
    const unspentBoxes = Array.from(this.unspentBoxes);
    for (const request of this.requests.values()) {
      let selectedBoxes: ErgoTransactionOutput[] = [];
      const totalAmounts: Map<string, number> = new Map<string, number>();

      for (const box of unspentBoxes) {
        const isFromCorrectAddress =
          ErgoAddress.fromErgoTree(
            box.ergoTree,
            this.networkType,
          ).toString() === request.address;
        const isNewBox =
          box.boxId && !this.alreadySelectedUnspentBoxIds.has(box.boxId);

        const hasRequiredTokens = request.tokens.some((token) =>
          (box.assets ?? []).some((asset) => asset.tokenId === token.tokenId),
        );

        if (isFromCorrectAddress && isNewBox && hasRequiredTokens) {
          selectedBoxes.push(box);
          for (const token of request.tokens) {
            const asset = (box.assets ?? []).find(
              (a) => a.tokenId === token.tokenId,
            );
            if (asset) {
              totalAmounts.set(
                token.tokenId,
                (totalAmounts.get(token.tokenId) || 0) + Number(asset.amount),
              );
            }
          }

          const isSufficient = request.tokens.every(
            (token) =>
              (totalAmounts.get(token.tokenId) || -1) >= Number(token.amount),
          );

          if (isSufficient) {
            for (const box of selectedBoxes)
              this.alreadySelectedUnspentBoxIds.add(box.boxId!);
            request.onSuffice(selectedBoxes);
            selectedBoxes = []; // reset for next round
            Object.keys(totalAmounts).forEach((k) => totalAmounts.delete(k));
          }
        }
      }
    }
    if (this.running) {
      this.latestTimeout = setTimeout(
        this.serveRequests,
        this.intervalAsSecond * 1000,
      );
    }
  };

  /**
   * stop the process of observing unspent boxes
   *
   * @return
   */
  public stop = async () => {
    clearTimeout(this.latestTimeout);
    this.running = false;
  };
}
