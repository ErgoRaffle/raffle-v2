import { NonMandatoryRegisters } from '@fleet-sdk/common';
import {
  ConstantInput,
  Network,
  SByte,
  SColl,
  SInt,
  SLong,
  TokenAmount,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import { raffleInfo } from '@ergo-raffle/contracts';

import { CreationProxyParams } from '../types';
import { bigIntToUint8Array, hexToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for raffle creation transactions
 * Handles the generation of proxy contracts for raffle creation requests
 */
export class CreationProxyGenerator extends BaseProxyGenerator<CreationProxyParams> {
  protected scriptName = 'creationProxy';

  constructor(networkType: Network = Network.Mainnet) {
    super(networkType);
    this.scriptAddress = this.buildScriptAddress(this.scriptName);
  }

  /**
   * Validate creation-specific parameters
   * @param params - Parameters to validate
   */
  protected validateSpecificParams = (params: CreationProxyParams): void => {
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
   * @returns Filled ErgoScript
   */
  protected fillContractParameters = (script: string): string => {
    let filledScript = script;
    const scriptParameters: Map<string, string> = new Map();
    scriptParameters.set(
      'SERVICE_NFT_B64',
      hexToBase64(raffleInfo.tokens.serviceNft),
    );
    scriptParameters.set(
      'RAFFLE_LICENSE_B64',
      hexToBase64(raffleInfo.tokens.raffleLicense),
    );

    // Setup parameter replacements from scriptParameters
    for (const [key, value] of scriptParameters) {
      filledScript = filledScript.replace(key, value);
    }

    return filledScript;
  };

  /**
   * Return registers with contract parameters
   * @param params - Contract parameters
   * @returns Registers with contract parameters
   */
  protected getRegisters = (
    params: CreationProxyParams,
  ): NonMandatoryRegisters<ConstantInput> => {
    /**
     * Correct output registers with contract parameters
     * R4: SColl(SLong, [expirationHeight, winnersPercent, ticketPrice, goal, raffleDeadline, txFee])
     * R5: SColl(SColl(SByte), [serviceNft, raffleLicense, implementorErgoTreeHash, creatorErgoTreeHash, winnersPercentListHash, collectingTokenId])
     * R6: SColl(SColl(SByte), [name, description, pictures])
     * R7: SColl(SInt, [winnersCount, isErgGoal])
     */

    let isErgGoal: number;
    let collectingTokenId: string;

    if (params.collectingTokenId) {
      collectingTokenId = params.collectingTokenId;
      isErgGoal = 0;
    } else {
      collectingTokenId = hexToBase64('0'.repeat(64));
      isErgGoal = 1;
    }

    const winnersPercentListHash = Buffer.from(
      blake2b256(
        Buffer.concat(
          params.winnersPercentList.map((n) => bigIntToUint8Array(n)),
        ),
      ),
    ).toString('base64');

    return {
      R4: SColl(SLong, [
        BigInt(params.expirationHeight),
        BigInt(params.raffleDeadline),
        BigInt(params.winnersPercent),
        BigInt(params.ticketPrice),
        BigInt(params.goal),
        BigInt(params.txFee),
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(params.implementorErgoTreeHash, 'hex')),
        Array.from(Buffer.from(params.creatorErgoTreeHash, 'hex')),
        Array.from(Buffer.from(winnersPercentListHash, 'base64')),
        Array.from(Buffer.from(collectingTokenId, 'hex')),
      ]).toHex(),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from(params.name)),
        Array.from(Buffer.from(params.description)),
        ...(params.pictures
          ? params.pictures.map((pic) => Array.from(Buffer.from(pic)))
          : []),
      ]).toHex(),
      R7: SColl(SInt, [params.winnerCount, isErgGoal]).toHex(),
    };
  };

  /**
   * Calculate required nano ERGs for creation transaction
   * @returns Required nano ERGs
   */
  protected calculateRequiredNanoErgs = (
    params: CreationProxyParams,
  ): bigint => {
    const requiredNanoErgsWithWinnerCountFee =
      params.txFee * BigInt(params.winnerCount) * BigInt(5) +
      params.txFee * BigInt(10);
    const requiredNanoErgsWithCreationFee =
      params.creationFee + params.txFee * BigInt(2);
    return requiredNanoErgsWithWinnerCountFee > requiredNanoErgsWithCreationFee
      ? requiredNanoErgsWithWinnerCountFee
      : requiredNanoErgsWithCreationFee;
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
