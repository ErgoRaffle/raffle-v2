import { Network, TokenAmount } from '@fleet-sdk/core';

import { AddGiftProxyParams, ProxyGenerationResult } from '../types';
import { stringToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for add gift transactions
 * Handles the generation of proxy contracts for adding gifts to raffle winners
 */
export class AddGiftProxyGenerator extends BaseProxyGenerator<AddGiftProxyParams> {
  constructor(networkType: Network = Network.Mainnet) {
    super(networkType);
  }
  /**
   * Generate proxy for add gift transaction
   * @param params - Add gift parameters from API
   * @returns ProxyGenerationResult with generated address and requirements
   */
  generateAddGiftProxy = (
    params: AddGiftProxyParams,
  ): ProxyGenerationResult => {
    this.validateAddGiftParams(params);

    const contractScript = this.loadScript('addGiftProxy');
    return this.generateProxyFromScript(contractScript, params);
  };

  /**
   * Validate add gift parameters
   * @param params - Parameters to validate
   */
  private validateAddGiftParams = (params: AddGiftProxyParams): void => {
    if (!params.raffleId || params.raffleId.trim().length === 0) {
      throw new Error('Raffle ID is required');
    }

    if (params.winnerIndex < 0) {
      throw new Error('Winner index must be non-negative');
    }

    if (
      !params.giftGiverAddress ||
      params.giftGiverAddress.trim().length === 0
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
    // TODO: Implement actual ErgoScript parameter substitution
    // This is where you'll replace placeholders in the .es file with actual values

    let filledScript = script;

    // Parameter replacements
    filledScript = filledScript.replace(
      'RAFFLE_ID_B64',
      stringToBase64(params.raffleId),
    );
    filledScript = filledScript.replace('DEADLINE', params.deadline.toString());
    filledScript = filledScript.replace(
      'WINNER_INDEX',
      params.winnerIndex.toString(),
    );
    filledScript = filledScript.replace(
      'GIFT_GIVER_ADDRESS_B64',
      stringToBase64(params.giftGiverAddress),
    );

    return filledScript;
  };

  /**
   * Calculate required nano ERGs for add gift transaction
   * @returns Required nano ERGs
   */
  protected calculateRequiredNanoErgs = (): bigint => {
    // Add gift requires 3x the transaction fee
    const baseTxFee = BigInt(1_000_000); // 0.001 ERG base transaction fee
    return baseTxFee * BigInt(3);
  };

  /**
   * Calculate required tokens for add gift transaction
   * @returns Required tokens array
   */
  protected calculateRequiredTokens = (): Array<TokenAmount<bigint>> => {
    // Add gift typically doesn't require specific tokens
    // The gift giver may add as many as tokens they want to the gift box
    return [];
  };
}
