import { Network, TokenAmount } from '@fleet-sdk/core';

import { DonationProxyParams, ProxyGenerationResult } from '../types';
import { stringToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for donation transactions
 * Handles the generation of proxy contracts for raffle ticket purchases
 */
export class DonationProxyGenerator extends BaseProxyGenerator<DonationProxyParams> {
  constructor(networkType: Network = Network.Mainnet) {
    super(networkType);
  }

  /**
   * Generate proxy for donation transaction
   * @param params - Donation parameters from API
   * @returns ProxyGenerationResult with generated address and requirements
   */
  generateDonationProxy = (
    params: DonationProxyParams,
  ): ProxyGenerationResult => {
    this.validateDonationParams(params);

    const contractScript = this.loadScript('donationProxy');
    return this.generateProxyFromScript(contractScript, params);
  };

  /**
   * Validate donation parameters
   * @param params - Parameters to validate
   */
  private validateDonationParams = (params: DonationProxyParams): void => {
    if (!params.ticketCount || params.ticketCount <= 0) {
      throw new Error('Valid ticket count is required');
    }

    if (!params.raffleId || params.raffleId.trim().length === 0) {
      throw new Error('Raffle ID is required');
    }

    if (!params.donatorAddress || params.donatorAddress.trim().length === 0) {
      throw new Error('Donator address is required');
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
    params: DonationProxyParams,
  ): string => {
    // TODO: Implement actual ErgoScript parameter substitution
    // This is where you'll replace placeholders in the .es file with actual values

    let filledScript = script;

    // Parameter replacements
    filledScript = filledScript.replace(
      'TICKET_COUNT',
      params.ticketCount.toString(),
    );
    filledScript = filledScript.replace('DEADLINE', params.deadline.toString());
    filledScript = filledScript.replace(
      'RAFFLE_ID_B64',
      stringToBase64(params.raffleId),
    );
    filledScript = filledScript.replace(
      'DONATOR_ADDRESS_B64',
      stringToBase64(params.donatorAddress),
    );

    if (params.requiredTokenId) {
      filledScript = filledScript.replace(
        'REQUIRED_TOKEN_ID_B64',
        stringToBase64(params.requiredTokenId),
      );
      filledScript = filledScript.replace(
        'REQUIRED_TOKEN_COUNT',
        params.requiredTokenCount?.toString() || '0',
      );
    } else {
      filledScript = filledScript.replace(
        'REQUIRED_TOKEN_ID_B64',
        stringToBase64(''),
      );
      filledScript = filledScript.replace('REQUIRED_TOKEN_COUNT', '0');
    }

    return filledScript;
  };

  /**
   * Calculate required nano ERGs for donation transaction
   * @param params - Contract parameters
   * @returns Required nano ERGs
   */
  protected calculateRequiredNanoErgs = (
    params: DonationProxyParams,
  ): bigint => {
    // Donation requires transaction fees plus ticket costs
    const ticketCount = params.ticketCount || 1;
    const baseFee = BigInt(1_000_000); // 0.001 ERG base fee
    const perTicketFee = BigInt(100_000); // 0.0001 ERG per ticket

    return baseFee + BigInt(ticketCount) * perTicketFee;
  };

  /**
   * Calculate required tokens for donation transaction
   * @param params - Contract parameters
   * @returns Required tokens array
   */
  protected calculateRequiredTokens = (
    params: DonationProxyParams,
  ): Array<TokenAmount<bigint>> => {
    // Donation might require specific tokens if the raffle collects tokens
    if (params.requiredTokenId && params.requiredTokenCount) {
      return [
        {
          tokenId: params.requiredTokenId,
          amount: params.requiredTokenCount,
        },
      ];
    }
    // No tokens are required for ERG-only raffles
    return [];
  };
}
