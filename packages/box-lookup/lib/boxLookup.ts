import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';

import { Request } from './types';
import { ErgoAddress, ErgoBox, Network } from '@fleet-sdk/core';
import { DataProvider } from './dataProvider';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected requests = new Map<number, Request>();

  constructor(
    protected dataProvider: DataProvider,
    protected networkType: Network,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {}

  getRequests = () => {
    return this.requests;
  };

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
   * Serve requests by considering unspent-boxes
   *
   * @returns
   */
  public serveRequests = async () => {
    if (this.requests.size <= 0) return;
    this.logger.info('The BoxLookup serving requests started');
    const [lastUnspentBoxes, lastStatusUpdate] =
      await this.dataProvider.getUnspentBoxes(
        Array.from(this.requests.values()),
      );
    let unspentBoxes = lastUnspentBoxes;
    const alreadySelectedUnspentBoxIds: Set<string> = new Set<string>();
    for (const request of this.requests.values()) {
      let selectedBoxes: ErgoBox[] = [];
      let totalTokenAmounts: Map<string, number> = new Map<string, number>();
      let totalErgValue = 0n;

      let boxIndex = 0;
      while (boxIndex < unspentBoxes.length) {
        const box = unspentBoxes[boxIndex];
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
                `Current collected tokens for request by ${request.address} address are ${JsonBigInt.stringify(Array.from(totalTokenAmounts))}`,
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
            `Current collected boxes for request by ${request.address} address are ${JsonBigInt.stringify(selectedBoxes)}, that is ${!isSufficient ? 'not ' : ''}suffice`,
          );

          if (isSufficient) {
            for (const box of selectedBoxes)
              alreadySelectedUnspentBoxIds.add(box.boxId!);
            await request.onSuffice(selectedBoxes, unspentBoxes);
            const [, newUnspentBoxes] =
              await this.dataProvider.getArrangedTxPotBoxes(lastStatusUpdate);
            const totalSpentBoxes = await this.dataProvider.getSpentBoxes();
            unspentBoxes = unspentBoxes
              .concat(newUnspentBoxes)
              .filter((val) => {
                return val.boxId && !totalSpentBoxes.has(val.boxId);
              });
            selectedBoxes = []; // reset for next round
            totalTokenAmounts = new Map<string, number>();
            totalErgValue = 0n;
            this.logger.info(
              `The BoxLookup triggered for ${request.address} request address`,
            );
            this.logger.debug(
              `The ${request.address} request address sufficed by ${JsonBigInt.stringify(selectedBoxes)} boxes`,
            );
          }
        }
        boxIndex += 1;
      }
    }
    this.logger.info('The BoxLookup serving requests done');
  };
}
