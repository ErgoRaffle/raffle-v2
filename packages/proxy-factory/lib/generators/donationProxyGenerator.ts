import { NonMandatoryRegisters } from '@fleet-sdk/common';
import {
  ConstantInput,
  Network,
  SByte,
  SColl,
  SLong,
  TokenAmount,
} from '@fleet-sdk/core';

import { raffleInfo } from '@ergo-raffle/contracts';

import { DonationProxyParams } from '../types';
import { hashAndSerializeToBase64, hexToBase64 } from '../utils';
import { BaseProxyGenerator } from './baseProxyGenerator';

/**
 * Proxy generator for donation transactions
 * Handles the generation of proxy contracts for raffle ticket purchases
 */
export class DonationProxyGenerator extends BaseProxyGenerator<DonationProxyParams> {
  protected scriptName = 'donationProxy';

  constructor(networkType: Network = Network.Mainnet) {
    super(networkType);
    this.scriptAddress = this.buildScriptAddress(this.scriptName);
  }

  /**
   * Validate donation-specific parameters
   * @param params - Parameters to validate
   */
  protected validateSpecificParams = (params: DonationProxyParams): void => {
    if (!params.ticketCount || params.ticketCount <= 0) {
      throw new Error('Valid ticket count is required');
    }

    if (!params.ticketPrice || params.ticketPrice <= 0n) {
      throw new Error('Valid ticket price is required');
    }

    if (!params.raffleId || params.raffleId.trim().length === 0) {
      throw new Error('Raffle ID is required');
    }

    if (
      !params.donatorErgoTreeHash ||
      params.donatorErgoTreeHash.trim().length === 0
    ) {
      throw new Error('Donator address is required');
    }
  };

  /**
   * Fill contract parameters into ErgoScript template
   * @param script - ErgoScript template
   * @param params - Parameters to fill
   * @returns Filled ErgoScript
   */
  protected fillContractParameters = (script: string): string => {
    const scriptParameters: Map<string, string> = new Map();
    scriptParameters.set(
      'RAFFLE_LICENSE_B64',
      hexToBase64(raffleInfo.tokens.raffleLicense),
    );

    scriptParameters.set(
      'TICKET_SCRIPT_HASH_B64',
      hashAndSerializeToBase64(raffleInfo.addresses.ticket),
    );

    // Setup parameter replacements from scriptParameters
    let filledScript = script;
    for (const [key, value] of scriptParameters) {
      filledScript = filledScript.replace(key, value);
    }

    return filledScript;
  };

  /**
   * Set registers with contract parameters
   * @param params - Contract parameters
   * @returns Filled registers
   */
  protected getRegisters = (
    params: DonationProxyParams,
  ): NonMandatoryRegisters<ConstantInput> => {
    return {
      R4: SColl(SLong, [
        BigInt(params.expirationHeight),
        BigInt(params.raffleDeadline),
        BigInt(params.ticketCount),
        BigInt(params.txFee),
      ]).toHex(),
      R5: SColl(SColl(SByte), [
        Array.from(Buffer.from(params.raffleId, 'hex')),
        Array.from(Buffer.from(params.donatorErgoTreeHash, 'hex')),
      ]).toHex(),
    };
  };

  /**
   * Calculate required nano ERGs for donation transaction
   * @param params - Contract parameters
   * @returns Required nano ERGs
   */
  protected calculateRequiredNanoErgs = (
    params: DonationProxyParams,
  ): bigint => {
    // Donation requires transaction fees (4x TxFee) plus ticket costs
    if (params.requiredTokenId) {
      return params.txFee * 4n;
    } else {
      return (
        params.ticketPrice * BigInt(params.ticketCount) + params.txFee * 4n
      );
    }
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
    if (params.requiredTokenId) {
      return [
        {
          tokenId: params.requiredTokenId,
          amount: params.ticketPrice * BigInt(params.ticketCount),
        },
      ];
    }
    // No tokens are required for ERG-only raffles
    return [];
  };
}
