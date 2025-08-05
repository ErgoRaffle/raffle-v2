import { ErgoAddress, ErgoBox, Network } from '@fleet-sdk/core';
import { BoxValue } from './types/box';
import { Request } from './types';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { cloneDeep } from 'lodash-es';

export class BoxSelector {
  private boxes: ErgoBox[] = [];
  private sumValue: BoxValue = {
    value: 0n,
    tokens: [],
  };

  constructor(
    private logger: AbstractLogger = new DummyLogger(),
    private request: Request,
    private networkType: Network,
  ) {}

  /**
   * Check if the box is related to the request
   * - Should have the same address as the request
   * - Should have the required tokens or the required ergs
   * @param box - The box to check
   * @returns True if the box is related to the request, false otherwise
   */
  isRelatedToRequest(box: ErgoBox) {
    const sameAddress =
      ErgoAddress.fromErgoTree(box.ergoTree, this.networkType).toString() ===
      this.request.address;

    const hasRequiredTokens = this.request.tokens.some((token) =>
      box.assets.some((asset) => asset.tokenId === token.tokenId),
    );
    const requiresErgs =
      this.request.value !== undefined && this.request.value > 0n;

    if (sameAddress) {
      this.logger.debug(
        `Box ${box.boxId} has the requested address [${this.request.address}]` +
          (hasRequiredTokens ? ` and required tokens` : '') +
          (requiresErgs ? ` and required ergs` : ''),
      );
    }
    return sameAddress && (hasRequiredTokens || requiresErgs);
  }

  /**
   * Add a box to the selected boxes and update the sum value
   * @param box - The box to add
   * @param boxValue - The value of the box
   */
  addBox(box: ErgoBox) {
    this.boxes.push(box);
    this.sumValue.value += box.value;
    for (const token of box.assets) {
      const existingToken = this.sumValue.tokens.find(
        (t) => t.tokenId === token.tokenId,
      );
      if (existingToken) {
        existingToken.amount += token.amount;
      } else {
        this.sumValue.tokens.push(cloneDeep(token));
      }
    }
    this.logger.debug(
      `Box ${box.boxId} added to the selected boxes` +
        ` and updated the sum value to ${this.sumValue.value}`,
    );
  }

  /**
   * Check if the selected boxes are covering the request
   * @param request - The request to check
   * @returns True if the selected boxes are covering the request, false otherwise
   */
  isCovering() {
    const coveringValue = this.request.value
      ? this.sumValue.value >= this.request.value
      : true;
    const coveringTokens = this.request.tokens.every((token) =>
      this.sumValue.tokens.some(
        (t) => t.tokenId === token.tokenId && t.amount >= token.amount,
      ),
    );
    this.logger.debug(
      `Selected boxes covering statue for request value: ${coveringValue} && tokens: ${coveringTokens}`,
    );
    return coveringValue && coveringTokens;
  }

  /**
   * Get the selected boxes
   * @returns The selected boxes
   */
  getBoxes() {
    return this.boxes;
  }
}
