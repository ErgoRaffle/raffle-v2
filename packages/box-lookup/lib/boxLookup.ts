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
import { ErgoAddress, Network, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected nodeAPI;
  protected requests = new Map<number, Request>();
  protected latestTimeout: ReturnType<typeof setTimeout>;

  constructor(
    protected txPot: TxPot,
    nodeURL: string,
    protected networkType: Network,
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
    const spentBoxes = new Set<string>([
      ...nodeInputBoxesIds,
      ...txPotInputBoxesIds,
    ]);
    const unspentBoxes: ErgoTransactionOutput[] = [
      ...nodeOutputBoxes,
      ...txPotOutputBoxes,
    ].filter(
      (val) => val.boxId && Array.from(spentBoxes).indexOf(val.boxId) < 0,
    );

    return [spentBoxes, unspentBoxes];
  };

  /**
   * Updates the list of unspent boxes and serves pending requests
   *
   * @returns
   */
  public serveRequests = async () => {
    if (this.requests.size <= 0) return;
    const [, unspentBoxes] = await this.updateBoxesLists();
    const alreadySelectedUnspentBoxIds: Set<string> = new Set<string>();
    let anyRequestTriggered = false;
    do {
      anyRequestTriggered = false;
      for (const request of this.requests.values()) {
        let selectedBoxes: ErgoTransactionOutput[] = [];
        let totalTokenAmounts: Map<string, number> = new Map<string, number>();
        let totalErgValue = 0n;

        for (const box of unspentBoxes as ErgoTransactionOutput[]) {
          const isFromCorrectAddress =
            ErgoAddress.fromErgoTree(
              box.ergoTree,
              this.networkType,
            ).toString() === request.address;
          const isNewBox =
            box.boxId && !alreadySelectedUnspentBoxIds.has(box.boxId);

          const hasRequiredTokens = request.tokens.some((token) =>
            (box.assets ?? []).some((asset) => asset.tokenId === token.tokenId),
          );

          const requiredErgs = request.nanoErgValue && request.nanoErgValue > 0;
          const hasRequiredErgs =
            requiredErgs &&
            request.nanoErgValue &&
            BigInt(box.value) - SAFE_MIN_BOX_VALUE >= 0;

          if (
            isFromCorrectAddress &&
            isNewBox &&
            (hasRequiredTokens || hasRequiredErgs)
          ) {
            totalErgValue += BigInt(box.value) - SAFE_MIN_BOX_VALUE;
            selectedBoxes.push(box);
            for (const token of request.tokens) {
              const asset = (box.assets ?? []).find(
                (a) => a.tokenId === token.tokenId,
              );
              if (asset) {
                totalTokenAmounts.set(
                  token.tokenId,
                  (totalTokenAmounts.get(token.tokenId) || 0) +
                    Number(asset.amount),
                );
              }
            }

            const isSufficient =
              request.tokens.every(
                // Considering tokens
                (token) =>
                  (totalTokenAmounts.get(token.tokenId) || -1) >=
                  Number(token.amount),
              ) &&
              // Considering Ergs
              (!request.nanoErgValue || totalErgValue >= request.nanoErgValue);

            if (
              isSufficient &&
              Array.from(this.requests.values()).indexOf(request) >= 0
            ) {
              for (const box of selectedBoxes)
                alreadySelectedUnspentBoxIds.add(box.boxId!);
              await request.onSuffice(selectedBoxes);
              selectedBoxes = []; // reset for next round
              totalTokenAmounts = new Map<string, number>();
              anyRequestTriggered = true;
            }
          }
        }
      }
    } while (anyRequestTriggered);
  };
}
