import { OutputBuilder, SColl, SByte, SInt, SLong } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { Buffer } from 'buffer';

import * as utils from '../../../lib/utils';

/** Params for creation proxy box (matches proxy-factory getRegisters format) */
export interface CreationProxyParams {
  creationFee: bigint;
  name: string;
  description: string;
  ticketPrice: bigint;
  goal: bigint;
  winnersPercent: number;
  implementerErgoTreeHash: string;
  organizerErgoTreeHash: string;
  projectErgoTreeHash: string;
  winnerCount: number;
  winnersPercentList: bigint[];
  txFee: bigint;
  expirationHeight: number;
  raffleDeadline: number;
  collectingTokenId?: string;
  tags: string;
  pictures?: string[];
}

/** Params for donation proxy box */
export interface DonationProxyParams {
  ticketCount: number;
  ticketPrice: bigint;
  raffleId: string;
  donatorErgoTreeHash: string;
  txFee: bigint;
  expirationHeight: number;
  raffleDeadline: number;
  requiredTokenId?: string;
}

/** Params for add gift proxy box */
export interface AddGiftProxyParams {
  raffleId: string;
  winnerIndex: number;
  giftGiverErgoTreeHash: string;
  txFee: bigint;
  expirationHeight: number;
  raffleDeadline: number;
}

function bigIntToUint8Array(num: bigint): Uint8Array {
  return utils.bigIntToUint8Array(num);
}

/**
 * Build creation proxy box. Registers match proxy-factory CreationProxyGenerator.getRegisters.
 */
export function buildCreationProxyBox(
  creationProxyErgoTree: string,
  params: CreationProxyParams,
  options?: { value?: bigint; creationHeight?: number },
): OutputBuilder {
  const winnersPercentListHash = Array.from(
    blake2b256(
      Buffer.concat(
        params.winnersPercentList.map((n) => bigIntToUint8Array(n)),
      ),
    ),
  );

  const requiredNanoErgs =
    params.txFee * BigInt(params.winnerCount) * 5n + params.txFee * 10n;
  const withCreationFee = params.creationFee + params.txFee * 2n;
  const value =
    options?.value ??
    (requiredNanoErgs > withCreationFee ? requiredNanoErgs : withCreationFee);

  const tokens =
    params.collectingTokenId != null
      ? [{ tokenId: params.collectingTokenId, amount: 1n }]
      : [];

  let out = new OutputBuilder(
    value,
    creationProxyErgoTree,
  ).setAdditionalRegisters({
    R4: SColl(SLong, [
      BigInt(params.expirationHeight),
      BigInt(params.raffleDeadline),
      BigInt(params.winnersPercent),
      params.ticketPrice,
      params.goal,
      params.txFee,
    ]).toHex(),
    R5: SColl(SColl(SByte), [
      Array.from(Buffer.from(params.implementerErgoTreeHash, 'hex')),
      Array.from(Buffer.from(params.organizerErgoTreeHash, 'hex')),
      Array.from(Buffer.from(params.projectErgoTreeHash, 'hex')),
      winnersPercentListHash,
    ]).toHex(),
    R6: SColl(SColl(SByte), [
      Array.from(Buffer.from(params.name)),
      Array.from(Buffer.from(params.description)),
      Array.from(Buffer.from(params.tags)),
      ...(params.pictures ?? []).map((p) => Array.from(Buffer.from(p))),
    ]).toHex(),
    R7: SInt(params.winnerCount).toHex(),
  });

  if (tokens.length > 0) out = out.addTokens(tokens);
  if (options?.creationHeight != null)
    out = out.setCreationHeight(options.creationHeight);
  return out;
}

/**
 * Build donation proxy box. Registers match proxy-factory DonationProxyGenerator.getRegisters.
 */
export function buildDonationProxyBox(
  donationProxyErgoTree: string,
  params: DonationProxyParams,
  options?: { value?: bigint; creationHeight?: number },
): OutputBuilder {
  const value =
    options?.value ??
    (params.requiredTokenId != null
      ? params.txFee * 4n
      : params.ticketPrice * BigInt(params.ticketCount) + params.txFee * 4n);

  const tokens =
    params.requiredTokenId != null
      ? [
          {
            tokenId: params.requiredTokenId,
            amount: params.ticketPrice * BigInt(params.ticketCount),
          },
        ]
      : [];

  let out = new OutputBuilder(
    value,
    donationProxyErgoTree,
  ).setAdditionalRegisters({
    R4: SColl(SLong, [
      BigInt(params.expirationHeight),
      BigInt(params.raffleDeadline),
      BigInt(params.ticketCount),
      params.txFee,
    ]).toHex(),
    R5: SColl(SColl(SByte), [
      Array.from(Buffer.from(params.raffleId, 'hex')),
      Array.from(Buffer.from(params.donatorErgoTreeHash, 'hex')),
    ]).toHex(),
  });

  if (tokens.length > 0) out = out.addTokens(tokens);
  if (options?.creationHeight != null)
    out = out.setCreationHeight(options.creationHeight);
  return out;
}

/**
 * Build add gift proxy box. Registers match proxy-factory AddGiftProxyGenerator.getRegisters.
 */
export function buildAddGiftProxyBox(
  addGiftProxyErgoTree: string,
  params: AddGiftProxyParams,
  options?: {
    value?: bigint;
    creationHeight?: number;
    tokens?: Array<{ tokenId: string; amount: bigint }>;
  },
): OutputBuilder {
  const value = options?.value ?? params.txFee * 4n;

  let out = new OutputBuilder(
    value,
    addGiftProxyErgoTree,
  ).setAdditionalRegisters({
    R4: SColl(SLong, [
      BigInt(params.expirationHeight),
      BigInt(params.raffleDeadline),
      BigInt(params.winnerIndex),
      params.txFee,
    ]).toHex(),
    R5: SColl(SColl(SByte), [
      Array.from(Buffer.from(params.raffleId, 'hex')),
      Array.from(Buffer.from(params.giftGiverErgoTreeHash, 'hex')),
    ]).toHex(),
  });

  if (options?.tokens?.length) out = out.addTokens(options.tokens);
  if (options?.creationHeight != null)
    out = out.setCreationHeight(options.creationHeight);
  return out;
}
