import { Network } from '@fleet-sdk/core';
import { Buffer } from 'node:buffer';

import {
  AddGiftProxyParams,
  ProxyGenerationResult,
  ErgoScriptParams,
} from '../types';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for add gift transactions
 * Handles the generation of proxy contracts for adding gifts to raffle winners
 */
export class AddGiftProxyGenerator extends BaseProxyGenerator {
  constructor(networkType: Network = Network.Mainnet) {
    super(networkType);
  }

  /**
   * Serialize string to base64
   * @param str - String to serialize
   * @returns Base64 encoded string
   */
  private stringToBase64(str: string): string {
    return Buffer.from(str, 'utf-8').toString('base64');
  }

  /**
   * Generate proxy for add gift transaction
   * @param params - Add gift parameters from API
   * @returns ProxyGenerationResult with generated address and requirements
   */
  generateAddGiftProxy(params: AddGiftProxyParams): ProxyGenerationResult {
    this.validateAddGiftParams(params);

    const ergoScriptParams = this.mapAddGiftParamsToErgoScript(params);
    const contractScript = this.loadScript('addGiftProxy');
    return this.generateProxyFromScript(contractScript, ergoScriptParams);
  }

  /**
   * Map add gift parameters to ErgoScript contract parameters
   * @param params - Add gift parameters
   * @returns ErgoScript parameters
   */
  private mapAddGiftParamsToErgoScript(
    params: AddGiftProxyParams,
  ): ErgoScriptParams {
    return {
      // Core add gift parameters
      raffleId: params.raffleId,
      winnerIndex: params.winnerIndex,
      giftGiverAddress: params.giftGiverAddress,

      // Calculated values
      requiredNanoErgs: params.requiredNanoErgs || this.calculateAddGiftFee(),
    };
  }

  /**
   * Validate add gift parameters
   * @param params - Parameters to validate
   */
  private validateAddGiftParams(params: AddGiftProxyParams): void {
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
  }

  /**
   * Calculate add gift fee
   * @returns Calculated fee
   */
  private calculateAddGiftFee(): bigint {
    // TODO: Implement actual fee calculation logic
    // Add gift typically requires 3x the transaction fee
    const baseTxFee = BigInt(1_000_000); // 0.001 ERG base transaction fee
    return baseTxFee * BigInt(3); // 3x fee for gift addition
  }

  /**
   * Fill contract parameters into ErgoScript template
   * @param script - ErgoScript template
   * @param params - Parameters to fill
   * @returns Filled ErgoScript
   */
  protected fillContractParameters(
    script: string,
    params: ErgoScriptParams,
  ): string {
    // TODO: Implement actual ErgoScript parameter substitution
    // This is where you'll replace placeholders in the .es file with actual values

    let filledScript = script;

    // Parameter replacements
    filledScript = filledScript.replace(
      'RAFFLE_ID_B64',
      this.stringToBase64(params.raffleId),
    );
    filledScript = filledScript.replace('DEADLINE', params.deadline.toString());
    filledScript = filledScript.replace(
      'WINNER_INDEX',
      params.winnerIndex.toString(),
    );
    filledScript = filledScript.replace(
      'GIFT_GIVER_ADDRESS_B64',
      this.stringToBase64(params.giftGiverAddress),
    );

    return filledScript;
  }

  /**
   * Compile ErgoScript to ErgoTree
   * @param script - Filled ErgoScript
   * @returns ErgoTree hash
   */
  protected compileErgoScript(script: string): string {
    // TODO: Implement actual ErgoScript compilation
    // This is where you'll compile the filled ErgoScript to ErgoTree
    // You might use a library like ergo-lib or similar

    // Placeholder implementation
    return `compiled_addgift_ergo_tree_hash_for_${script.substring(0, 10)}`;
  }

  /**
   * Calculate required nano ERGs for add gift transaction
   * @param params - Contract parameters
   * @returns Required nano ERGs
   */
  protected calculateRequiredNanoErgs(): bigint {
    // Add gift requires 3x the transaction fee
    const baseTxFee = BigInt(1_000_000); // 0.001 ERG base transaction fee
    return baseTxFee * BigInt(3);
  }

  /**
   * Calculate required tokens for add gift transaction
   * @param params - Contract parameters
   * @returns Required tokens array
   */
  protected calculateRequiredTokens():
    | Array<{ tokenId: string; amount: bigint }>
    | undefined {
    // Add gift typically doesn't require specific tokens
    // The gift itself will be handled by the actual gift transaction
    return undefined;
  }

  /**
   * Validate parameters before generation
   * @param params - Parameters to validate
   */
  protected validateParams(params: ErgoScriptParams): void {
    // Additional validation logic specific to add gift
    if (params.winnerIndex && params.winnerIndex > 100) {
      throw new Error('Winner index cannot exceed 100');
    }
  }
}
