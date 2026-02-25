import { raffleInfo } from '@ergo-raffle/contracts';
import { Network, OutputBuilder, TokenAmount } from '@fleet-sdk/core';

import { AddGiftProxyParams, ProxyGenerationResult } from '../types';
import { hashAndSerializeToBase64, hexToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for add gift transactions
 * Handles the generation of proxy contracts for adding gifts to raffle winners
 */
export class AddGiftProxyGenerator extends BaseProxyGenerator<AddGiftProxyParams> {
  protected scriptName = 'addGiftProxy';

  constructor(networkType: Network = Network.Mainnet) {
    super(networkType, 'addGiftProxy');
  }
  /**
   * Generate proxy for add gift transaction
   * @param params - Add gift parameters from API
   * @returns ProxyGenerationResult with generated address and requirements
   */
  generateAddGiftProxy = (
    params: AddGiftProxyParams,
  ): ProxyGenerationResult => {
    return this.generateProxy(params);
  };

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
   * @param params - Parameters to fill
   * @returns Filled ErgoScript
   */
  protected fillContractParameters = (
    script: string,
    params: AddGiftProxyParams,
  ): string => {
    const scriptParameters: Map<string, string> = new Map();
    scriptParameters.set('RAFFLE_ID_B64', hexToBase64(params.raffleId));
    scriptParameters.set('DEADLINE', params.raffleDeadline.toString());
    scriptParameters.set('WINNER_INDEX', params.winnerIndex.toString());
    scriptParameters.set(
      'GIFT_GIVER_ERGO_TREE_HASH_B64',
      hexToBase64(params.giftGiverErgoTreeHash),
    );
    scriptParameters.set(
      'GIFT_SCRIPT_HASH_B64',
      hashAndSerializeToBase64(raffleInfo.addresses.gift),
    );
    scriptParameters.set(
      'EXPIRATION_HEIGHT',
      params.expirationHeight.toString(),
    );
    scriptParameters.set('TX_FEE', params.txFee.toString());

    // Setup parameter replacements from scriptParameters
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
    // in case to ignore eslint error, must be removed later
    console.log('Filling registers for add gift proxy with params:', params);
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
