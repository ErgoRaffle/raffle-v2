import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';

import { Request } from './types';
import { OutputBox } from './types';
import { BoxValue } from './types/box';

export class BoxSelector {
  private boxes: OutputBox[] = [];
  private sumValue: BoxValue = {
    value: 0n,
    tokens: [],
  };

  constructor(
    private logger: AbstractLogger = new DummyLogger(),
    private request: Request,
  ) {}

  /**
   * Determines if a box meets all criteria for selection.
   *
   * A box is eligible for selection when:
   * - It belongs to the same ergoTree as the request, AND
   * - It either:
   *   - Contains the required tokens, OR
   *   - Has sufficient ERG value, OR
   *   - The request doesn't require any specific assets
   *
   * @param box - The box to check
   * @returns True if the box is eligible for selection, false otherwise
   */
  isEligibleForSelection = (box: OutputBox) => {
    const sameErgoTree = box.ergoTree === this.request.ergoTree;

    const hasRequiredTokens = this.request.tokens.some((token) =>
      box.assets.some((asset) => asset.tokenId === token.tokenId),
    );
    const requiresErgs =
      this.request.value !== undefined && BigInt(this.request.value) > 0n;
    const requestNoAsset = !requiresErgs && this.request.tokens.length === 0;

    if (sameErgoTree) {
      this.logger.debug(
        `Box ${box.boxId} has the requested ergoTree [${this.request.ergoTree}]` +
          (hasRequiredTokens ? ` and required tokens` : '') +
          (requiresErgs ? ` and required ergs` : ''),
      );
    }

    const meetsAssetRequirements =
      hasRequiredTokens || requiresErgs || requestNoAsset;
    return sameErgoTree && meetsAssetRequirements;
  };

  /**
   * Add a box to the selected boxes and update the sum value
   * @param box - The box to add
   */
  addBox = (box: OutputBox) => {
    this.boxes.push(box);
    this.sumValue.value = BigInt(this.sumValue.value) + BigInt(box.value);
    for (const token of box.assets) {
      const existingToken = this.sumValue.tokens.find(
        (t) => t.tokenId === token.tokenId,
      );
      if (existingToken) {
        existingToken.amount =
          BigInt(existingToken.amount) + BigInt(token.amount);
      } else {
        this.sumValue.tokens.push({
          tokenId: token.tokenId,
          amount: BigInt(token.amount),
        });
      }
    }
    this.logger.debug(
      `Box ${box.boxId} added to the selected boxes` +
        ` and updated the sum value and tokens to ${JsonBigInt.stringify(this.sumValue)}`,
    );
  };

  /**
   * Check if the selected boxes are covering the request
   * @returns True if the selected boxes are covering the request, false otherwise
   */
  isCovering = () => {
    const coveringValue = this.request.value
      ? BigInt(this.sumValue.value) >= BigInt(this.request.value)
      : true;
    const coveringTokens = this.request.tokens.every((token) =>
      this.sumValue.tokens.some(
        (t) =>
          t.tokenId === token.tokenId &&
          BigInt(t.amount) >= BigInt(token.amount),
      ),
    );
    this.logger.debug(
      `Selected boxes covering statue for request value: ${coveringValue} && tokens: ${coveringTokens}`,
    );
    return coveringValue && coveringTokens;
  };

  /**
   * Get the selected boxes
   * @returns The selected boxes
   */
  getBoxes = () => {
    return this.boxes;
  };
}
