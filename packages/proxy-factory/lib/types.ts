import { TokenAmount } from '@fleet-sdk/core';

/**
 * Parameters for Creation proxy generation
 */
export interface CreationProxyParams {
  /** Raffle name */
  name: string;
  /** Raffle description */
  description: string;
  /** Ticket price in nano ERGs */
  ticketPrice: bigint;
  /** Funding goal in nano ERGs */
  goal: bigint;
  /** Winners percentage */
  winnersPercent: number;
  /** Transaction fee in nano ERGs */
  txFee: bigint;
  /** Implementer address */
  implementorErgoTreeHash: string;
  /** Creator address */
  creatorErgoTreeHash: string;
  /** Number of winners */
  winnerCount: number;
  /** Winners share percentages as comma-separated string */
  winnersPercentList: string;
  /** Raffle deadline */
  deadline: number;
  /** Expiration height for the proxy contract */
  expirationHeight: number;
  /** Collecting token ID (optional for ERG-only raffles) */
  collectingTokenId?: string;
  /** Raffle pictures URLs */
  pictures?: string[];
}

/**
 * Parameters for Donation proxy generation
 */
export interface DonationProxyParams {
  /** Number of tickets to buy */
  ticketCount: number;
  /** Raffle ID */
  raffleId: string;
  /** Donator address */
  donatorAddress: string;
  /** Raffle deadline */
  deadline: number;
  /** Required token ID (if collecting token) */
  requiredTokenId?: string;
  /** Required token amount (if collecting token) */
  requiredTokenCount?: bigint;
}

/**
 * Parameters for AddGift proxy generation
 */
export interface AddGiftProxyParams {
  /** Raffle ID */
  raffleId: string;
  /** Winner index to receive the gift */
  winnerIndex: number;
  /** Gift giver address */
  giftGiverAddress: string;
  /** Raffle deadline */
  deadline: number;
}

/**
 * Result of proxy generation
 */
export interface ProxyGenerationResult {
  /** Generated proxy address */
  proxyAddress: string;
  /** Required nano ERGs */
  requiredNanoErgs: bigint;
  /** Additional required tokens (if any) */
  requiredTokens?: Array<TokenAmount<bigint>>;
}
