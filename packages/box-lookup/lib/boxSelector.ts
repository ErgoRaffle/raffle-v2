import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { cloneDeep } from 'lodash-es';
import JsonBigInt from '@rosen-bridge/json-bigint';
import * as ergoLib from 'ergo-lib-wasm-nodejs';

import { BoxValue } from './types/box';
import { Request } from './types';
import { OutputBox } from './types';
import { ErgoNetwork } from './types/network';

export class BoxSelector {
  private boxes: OutputBox[] = [];
  private sumValue: BoxValue = {
    value: 0n,
    tokens: [],
  };

  constructor(
    private logger: AbstractLogger = new DummyLogger(),
    private request: Request,
    private networkType: ErgoNetwork,
  ) {}

  /**
   * Determines if a box meets all criteria for selection.
   *
   * A box is eligible for selection when:
   * - It belongs to the same address as the request, AND
   * - It either:
   *   - Contains the required tokens, OR
   *   - Has sufficient ERG value, OR
   *   - The request doesn't require any specific assets
   *
   * @param box - The box to check
   * @returns True if the box is eligible for selection, false otherwise
   */
  isEligibleForSelection = (box: OutputBox) => {
    let sameAddress = false;
    try {
      const ergoTree = ergoLib.ErgoTree.from_base16_bytes(box.ergoTree);
      const prefix =
        this.networkType === ErgoNetwork.Mainnet
          ? ergoLib.NetworkPrefix.Mainnet
          : ergoLib.NetworkPrefix.Testnet;
      const address = ergoLib.Address.recreate_from_ergo_tree(ergoTree)
        .to_base58(prefix)
        .toString();
      sameAddress = address === this.request.address;
    } catch (e) {
      this.logger.debug(
        `Failed to recreate address from ergoTree for box [${box.boxId}]`,
      );
      sameAddress = false;
    }

    const hasRequiredTokens = this.request.tokens.some((token) =>
      box.assets.some((asset) => asset.tokenId === token.tokenId),
    );
    const requiresErgs =
      this.request.value !== undefined && this.request.value > 0n;
    const requestNoAsset = !requiresErgs && this.request.tokens.length === 0;

    if (sameAddress) {
      this.logger.debug(
        `Box ${box.boxId} has the requested address [${this.request.address}]` +
          (hasRequiredTokens ? ` and required tokens` : '') +
          (requiresErgs ? ` and required ergs` : ''),
      );
    }

    const meetsAssetRequirements =
      hasRequiredTokens || requiresErgs || requestNoAsset;
    return sameAddress && meetsAssetRequirements;
  };

  /**
   * Add a box to the selected boxes and update the sum value
   * @param box - The box to add
   */
  addBox = (box: OutputBox) => {
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
        ` and updated the sum value and tokens to ${JsonBigInt.stringify(this.sumValue)}`,
    );
  };

  /**
   * Check if the selected boxes are covering the request
   * @returns True if the selected boxes are covering the request, false otherwise
   */
  isCovering = () => {
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
  };

  /**
   * Get the selected boxes
   * @returns The selected boxes
   */
  getBoxes = () => {
    return this.boxes;
  };
}
