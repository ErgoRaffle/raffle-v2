import { raffleInfo } from '@ergo-raffle/contracts';
import {
  Network,
  OutputBuilder,
  SByte,
  SColl,
  SInt,
  SLong,
  TokenAmount,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import { CreationProxyParams } from '../types';
import { bigIntToUint8Array, hexToBase64, stringToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for raffle creation transactions
 * Handles the generation of proxy contracts for raffle creation requests
 */
export class CreationProxyGenerator extends BaseProxyGenerator<CreationProxyParams> {
  protected scriptName = 'creationProxy';

  constructor(networkType: Network = Network.Mainnet) {
    super(networkType, 'creationProxy');
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
   * @param params - Parameters to fill
   * @returns Filled ErgoScript
   */
  protected fillContractParameters = (
    script: string,
    params: CreationProxyParams,
  ): string => {
    let filledScript = script;
    const scriptParameters: Map<string, string> = new Map();
    scriptParameters.set(
      'INACTIVE_RAFFLE_SCRIPT_HASH',
      raffleInfo.addresses.inactiveRaffle,
    );
    scriptParameters.set(
      'SERVICE_NFT_B64',
      hexToBase64(raffleInfo.tokens.serviceNft),
    );
    scriptParameters.set(
      'RAFFLE_LICENSE_B64',
      hexToBase64(raffleInfo.tokens.raffleLicense),
    );
    scriptParameters.set(
      'EXPIRATION_HEIGHT',
      params.expirationHeight.toString(),
    );
    scriptParameters.set('TICKET_PRICE', params.ticketPrice.toString());
    scriptParameters.set('GOAL', params.goal.toString());
    scriptParameters.set('DEADLINE', params.raffleDeadline.toString());
    scriptParameters.set('WINNER_COUNT', params.winnerCount.toString());
    scriptParameters.set('WINNERS_PERCENT', params.winnersPercent.toString());
    scriptParameters.set('TX_FEE', params.txFee.toString());
    scriptParameters.set(
      'CREATOR_ERGO_TREE_HASH_B64',
      hexToBase64(params.creatorErgoTreeHash),
    );
    scriptParameters.set(
      'IMPLEMENTOR_ERGO_TREE_HASH_B64',
      hexToBase64(params.implementorErgoTreeHash),
    );
    const winnersPercentListHash = Buffer.from(
      blake2b256(
        Buffer.concat(
          params.winnersPercentList.map((n) => bigIntToUint8Array(n)),
        ),
      ),
    ).toString('base64');
    scriptParameters.set(
      'WINNERS_PERCENT_LIST_HASH_B64',
      winnersPercentListHash,
    );
    scriptParameters.set('NAME_B64', stringToBase64(params.name));
    scriptParameters.set('DESCRIPTION_B64', stringToBase64(params.description));

    // TODO: Fix pictures serialization and constraints
    // if(params.pictures) {
    //   const pictures = params.pictures.map((picture) => Buffer.from(stringToBase64(picture)));
    //   const x = SColl(SColl(SByte), [
    //     ...pictures.map((picture) => Array.from(picture)),
    //   ]).toHex();
    //   scriptParameters.set('PICTURES_B64', x);
    // }

    if (params.collectingTokenId) {
      scriptParameters.set(
        'COLLECTING_TOKEN_ID_B64',
        hexToBase64(params.collectingTokenId),
      );
      scriptParameters.set('IS_ERG_GOAL', 'false');
    } else {
      scriptParameters.set(
        'COLLECTING_TOKEN_ID_B64',
        hexToBase64('0'.repeat(64)),
      );
      scriptParameters.set('IS_ERG_GOAL', 'true');
    }

    // Setup parameter replacements from scriptParameters
    for (const [key, value] of scriptParameters) {
      filledScript = filledScript.replace(key, value);
    }

    return filledScript;
  };

  /**
   * Fill output registers with contract parameters
   * @param outputBuilder - OutputBuilder instance
   * @param params - Contract parameters
   * @returns Updated OutputBuilder
   */
  protected fillRegisters = (
    outputBuilder: OutputBuilder,
    params: CreationProxyParams,
  ): OutputBuilder => {
    /**
     * Correct output registers with contract parameters
     * R4: SColl(SLong, [expirationHeight, winnersPercent, ticketPrice, goal, raffleDeadline, txFee, isErgGoal])
     * R5: SColl(SColl(SByte), [serviceNft, raffleLicense, implementorErgoTreeHash, creatorErgoTreeHash, winnersPercentListHash, collectingTokenId])
     * R6: SColl(SColl(SByte), [name, description, pictures])
     * R7: SInt(winnerCount)
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

    // TODO: Fix pictures serialization and constraints
    // if (params.pictures) {
    //   const pictures = params.pictures.map((picture) =>
    //     Buffer.from(stringToBase64(picture)),
    //   );
    //   const x = SColl(SColl(SByte), [
    //     ...pictures.map((picture) => Array.from(picture)),
    //   ]).toHex();
    // }

    outputBuilder.setAdditionalRegisters({
      R4: SColl(SLong, [
        BigInt(params.expirationHeight),
        BigInt(params.winnersPercent),
        BigInt(params.ticketPrice),
        BigInt(params.goal),
        BigInt(params.raffleDeadline),
        BigInt(params.txFee),
        BigInt(isErgGoal),
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Uint8Array.from(raffleInfo.tokens.serviceNft)),
        Array.from(Uint8Array.from(raffleInfo.tokens.raffleLicense)),
        Array.from(Uint8Array.from(params.implementorErgoTreeHash)),
        Array.from(Uint8Array.from(params.creatorErgoTreeHash)),
        Array.from(Uint8Array.from(winnersPercentListHash)),
        Array.from(Uint8Array.from(collectingTokenId)),
      ]).toHex(),
      R6: SColl(SColl(SByte), [
        Array.from(Buffer.from(params.name)),
        Array.from(Buffer.from(params.description)),
        //x,
      ]).toHex(),
      R7: SInt(params.winnerCount).toHex(),
    });

    return outputBuilder;
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
