import { raffleInfo } from '@ergo-raffle/contracts';
import {
  Network,
  OutputBuilder,
  SByte,
  SColl,
  SLong,
  TokenAmount,
} from '@fleet-sdk/core';

import { AddGiftProxyParams } from '../types';
import { hashAndSerializeToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for add gift transactions
 * Handles the generation of proxy contracts for adding gifts to raffle winners
 */
export class AddGiftProxyGenerator extends BaseProxyGenerator<AddGiftProxyParams> {
  protected scriptName = 'addGiftProxy';

  constructor(networkType: Network = Network.Mainnet) {
    super(networkType);
    this.scriptAddress = this.buildScriptAddress(this.scriptName);
  }

  /**
   * Validate add gift-specific parameters
   * Base parameters (txFee, expirationHeight, raffleDeadline) are validated in base class
   * @param params - Parameters to validate
   */
  protected validateSpecificParams = (params: AddGiftProxyParams): void => {
    if (!params.raffleId || params.raffleId.trim().length === 0) {
      throw new Error('Raffle ID is required');
    }

    if (params.winnerIndex < 0) {
      throw new Error('Winner index must be non-negative');
    }

    if (
      !params.giftGiverErgoTreeHash ||
      params.giftGiverErgoTreeHash.trim().length === 0
    ) {
      throw new Error('Gift giver address is required');
    }
  };

  /**
   * Fill contract parameters into ErgoScript template
   * @param script - ErgoScript template
   * @returns Filled ErgoScript
   */
  protected fillContractParameters = (script: string): string => {
    const scriptParameters: Map<string, string> = new Map();

    scriptParameters.set(
      'GIFT_SCRIPT_HASH_B64',
      hashAndSerializeToBase64(raffleInfo.addresses.gift),
    );

    // Setup parameter replacements
    let filledScript = script;
    for (const [key, value] of scriptParameters) {
      filledScript = filledScript.replace(key, value);
    }
    return filledScript;
  };

  /**
   * Fill box registers with contract parameters
   * @param outputBuilder - OutputBuilder instance
   * @param params - Contract parameters
   * @returns Updated OutputBuilder
   */
  protected fillRegisters = (
    outputBuilder: OutputBuilder,
    params: AddGiftProxyParams,
  ): OutputBuilder => {
    outputBuilder.setAdditionalRegisters({
      R4: SColl(SLong, [
        BigInt(params.expirationHeight),
        BigInt(params.raffleDeadline),
        BigInt(params.winnerIndex),
        BigInt(params.txFee),
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(params.raffleId, 'hex')),
        Array.from(Buffer.from(params.giftGiverErgoTreeHash, 'hex')),
      ]).toHex(),
    });

    return outputBuilder;
  };

  /**
   * Calculate required nano ERGs for add gift transaction
   * @returns Required nano ERGs
   */
  protected calculateRequiredNanoErgs = (
    params: AddGiftProxyParams,
  ): bigint => {
    // Add gift requires 4x the transaction fee
    return params.txFee * 4n;
  };

  /**
   * Calculate required tokens for add gift transaction
   * @param params - Contract parameters
   * @returns Required tokens array
   */
  protected calculateRequiredTokens = (): Array<TokenAmount<bigint>> => {
    // Add gift typically doesn't require specific tokens
    // The gift giver may add as many as tokens they want to the gift box
    return [];
  };
}
