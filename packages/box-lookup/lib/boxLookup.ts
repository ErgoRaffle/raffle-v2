import {
  TransactionEntity,
  TransactionStatus,
  TxPot,
} from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import ergoNodeClientFactory from '@rosen-clients/ergo-node';

import { Request } from './types';
import { API_LIMIT } from './constants';
import { ErgoAddress, ErgoBox, Network } from '@fleet-sdk/core';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected nodeAPI;
  protected requests = new Map<number, Request>();
  protected extraUnspentBoxes: ErgoBox[] = [];

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
   * @return { [string[],  ErgoBox[]] }
   */
  protected readonly getArrangedNodeBoxes = async (): Promise<
    [string[], ErgoBox[]]
  > => {
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
   * @return { [string[],  ErgoBox[]] }
   */
  protected readonly getArrangedTxPotBoxes = async (): Promise<
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
   * Collect unspent Boxes by node & TxPot data
   *
   * @return
   */
  protected getUnspentBoxes = async (): Promise<ErgoBox[]> => {
    const [nodeInputBoxesIds, nodeOutputBoxes] =
      await this.getArrangedNodeBoxes();
    const [txPotInputBoxesIds, txPotOutputBoxes] =
      await this.getArrangedTxPotBoxes();
    const spentBoxes = new Set<string>([
      ...nodeInputBoxesIds,
      ...txPotInputBoxesIds,
    ]);
    const unspentBoxes: ErgoBox[] = [
      ...nodeOutputBoxes,
      ...txPotOutputBoxes,
      ...this.extraUnspentBoxes,
    ].filter((val) => val.boxId && !spentBoxes.has(val.boxId));

    return unspentBoxes;
  };

  /**
   * Serve requests by considering unspent-boxes
   *
   * @returns
   */
  public serveRequests = async () => {
    if (this.requests.size <= 0) return;
    this.logger.info('The BoxLookup serving requests started');
    const unspentBoxes = await this.getUnspentBoxes();
    const alreadySelectedUnspentBoxIds: Set<string> = new Set<string>();
    for (const request of this.requests.values()) {
      let selectedBoxes: ErgoBox[] = [];
      let totalTokenAmounts: Map<string, number> = new Map<string, number>();
      let totalErgValue = 0n;

      for (const box of unspentBoxes) {
        // check if current request unregistered then breaking the loop
        if (Array.from(this.requests.values()).indexOf(request) < 0) break;

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

        const requiredErgs = request.value && request.value > 0;
        const hasRequiredErgs = requiredErgs && request.value;

        if (
          isFromCorrectAddress &&
          isNewBox &&
          (hasRequiredTokens || hasRequiredErgs)
        ) {
          totalErgValue += BigInt(box.value);
          this.logger.debug(
            `Current collected erg values for request by ${request.address} address is ${totalErgValue}`,
          );
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
              this.logger.debug(
                `Current collected tokens for request by ${request.address} address are ${JSON.stringify(Array.from(totalTokenAmounts))}`,
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
            (!request.value || totalErgValue >= request.value);

          this.logger.debug(
            `Current collected boxes for request by ${request.address} address are ${JSON.stringify(selectedBoxes)}, that is ${!isSufficient ? 'not ' : ''}suffice`,
          );

          if (isSufficient) {
            for (const box of selectedBoxes)
              alreadySelectedUnspentBoxIds.add(box.boxId!);
            await request.onSuffice(selectedBoxes);
            selectedBoxes = []; // reset for next round
            totalTokenAmounts = new Map<string, number>();
            totalErgValue = 0n;
            this.logger.info(
              `The BoxLookup triggered for ${request.address} request address`,
            );
            this.logger.debug(
              `The ${request.address} request address sufficed by ${JSON.stringify(selectedBoxes)} boxes`,
            );
          }
        }
      }
    }
    this.logger.info('The BoxLookup serving requests done');
  };
}
