import { raffleInfo } from '@ergo-raffle/contracts';
import { Network, TokenAmount } from '@fleet-sdk/core';

import { CreationProxyParams, ProxyGenerationResult } from '../types';
import { stringToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for raffle creation transactions
 * Handles the generation of proxy contracts for raffle creation requests
 */
export class CreationProxyGenerator extends BaseProxyGenerator<CreationProxyParams> {
  constructor(networkType: Network = Network.Mainnet) {
    super(networkType);
  }

  /**
   * Generate proxy for raffle creation
   * @param params - Creation parameters from API
   * @returns ProxyGenerationResult with generated address and requirements
   */
  generateCreationProxy = (
    params: CreationProxyParams,
  ): ProxyGenerationResult => {
    this.validateCreationParams(params);

    const contractScript = this.loadScript('creationProxy');
    return this.generateProxyFromScript(contractScript, params);
  };

  /**
   * Validate creation parameters
   * @param params - Parameters to validate
   */
  private validateCreationParams = (params: CreationProxyParams): void => {
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Raffle name is required');
    }

    if (!params.description || params.description.trim().length === 0) {
      throw new Error('Raffle description is required');
    }

    if (!params.ticketPrice || params.ticketPrice <= 0n) {
      throw new Error('Valid ticket price is required');
    }

    if (!params.goal || params.goal <= 0n) {
      throw new Error('Valid funding goal is required');
    }

    if (!params.deadline || params.deadline <= 0) {
      throw new Error('Valid deadline is required');
    }

    if (!params.winnerCount || params.winnerCount <= 0) {
      throw new Error('Valid winner count is required');
    }

    if (!params.creatorErgoTreeHash) {
      throw new Error('Creator ergo tree hash is required');
    }

    if (!params.implementorErgoTreeHash) {
      throw new Error('Implementor ergotree hash is required');
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
    params: CreationProxyParams,
  ): string => {
    // TODO: Implement actual ErgoScript parameter substitution
    // This is where you'll replace placeholders in the .es file with actual values

    let filledScript = script;

    // Setup parameter replacements from raffleInfo
    filledScript = filledScript.replace(
      'INACTIVE_RAFFLE_SCRIPT_HASH',
      raffleInfo.addresses.inactiveRaffle,
    );
    filledScript = filledScript.replace(
      'SERVICE_NFT_B64',
      stringToBase64(raffleInfo.tokens.serviceNft),
    );
    filledScript = filledScript.replace(
      'RAFFLE_LICENSE_B64',
      stringToBase64(raffleInfo.tokens.raffleLicense),
    );

    // User parameter replacements (serialized to base64)
    filledScript = filledScript.replace(
      'NAME_B64',
      stringToBase64(params.name),
    );
    filledScript = filledScript.replace(
      'DESCRIPTION_B64',
      stringToBase64(params.description),
    );
    filledScript = filledScript.replace(
      'PICTURES_B64',
      stringToBase64(params.pictures?.join(',') || ''),
    );

    filledScript = filledScript.replace(
      'TICKET_PRICE',
      params.ticketPrice.toString(),
    );
    filledScript = filledScript.replace('GOAL', params.goal.toString());
    filledScript = filledScript.replace('DEADLINE', params.deadline.toString());
    filledScript = filledScript.replace(
      'EXPIRATION_HEIGHT',
      params.expirationHeight.toString(),
    );
    filledScript = filledScript.replace(
      'WINNER_COUNT',
      params.winnerCount.toString(),
    );

    filledScript = filledScript.replace(
      'CREATOR_ERGO_TREE_HASH_B64',
      stringToBase64(params.creatorErgoTreeHash),
    );
    filledScript = filledScript.replace(
      'IMPLEMENTOR_ERGO_TREE_HASH_B64',
      stringToBase64(params.implementorErgoTreeHash),
    );

    filledScript = filledScript.replace(
      'WINNERS_PERCENT',
      params.winnersPercent.toString(),
    );
    filledScript = filledScript.replace('TX_FEE', params.txFee.toString());
    filledScript = filledScript.replace(
      'WINNERS_PERCENT_LIST_HASH_B64',
      stringToBase64(params.winnersPercentList),
    );

    if (params.collectingTokenId) {
      filledScript = filledScript.replace(
        'COLLECTING_TOKEN_ID_B64',
        stringToBase64(params.collectingTokenId),
      );
    } else {
      filledScript = filledScript.replace(
        'COLLECTING_TOKEN_ID_B64',
        stringToBase64(''),
      );
    }

    return filledScript;
  };

  /**
   * Calculate required nano ERGs for creation transaction
   * @returns Required nano ERGs
   */
  protected calculateRequiredNanoErgs = (): bigint => {
    // TODO: Implement actual fee calculation
    return BigInt(1_000_000_000);
  };

  /**
   * Calculate required tokens for creation transaction
   * @param params - Contract parameters
   * @returns Required tokens array
   */
  protected calculateRequiredTokens = (
    params: CreationProxyParams,
  ): Array<TokenAmount<bigint>> => {
    // Creation might require specific tokens if it's a token-goal raffle
    if (params.collectingTokenId) {
      return [
        {
          tokenId: params.collectingTokenId,
          amount: BigInt(1), // Minimum amount for token-goal raffles
        },
      ];
    }
    // No tokens are required for ERG-only raffles
    return [];
  };
}
