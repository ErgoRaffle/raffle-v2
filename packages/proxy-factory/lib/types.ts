import { TokenAmount } from '@fleet-sdk/core';

export interface BaseProxyParams {
  /** Tx fee in nano ERGs */
  txFee: bigint;
  /** Expiration height for the proxy contract */
  expirationHeight: number;
  /** Raffle deadline */
  raffleDeadline: number;
}

/**
 * Parameters for Creation proxy generation
 */
export interface CreationProxyParams extends BaseProxyParams {
  /** Creation fee in nano ERGs */
  creationFee: bigint;
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
  /** Implementer address */
  implementorErgoTreeHash: string;
  /** Creator address */
  creatorErgoTreeHash: string;
  /** Number of winners */
  winnerCount: number;
  /** Winners share percentages */
  winnersPercentList: bigint[];
  /** Collecting token ID (optional for ERG-only raffles) */
  collectingTokenId?: string;
  /** Raffle pictures URLs */
  pictures?: string[];
}

/**
 * Parameters for Donation proxy generation
 */
export interface DonationProxyParams extends BaseProxyParams {
  /** Number of tickets to buy */
  ticketCount: number;
  /** Ticket price */
  ticketPrice: bigint;
  /** Raffle ID */
  raffleId: string;
  /** Donator address */
  donatorErgoTreeHash: string;
  /** Required token ID (if token-goal raffle) */
  requiredTokenId?: string;
}

/**
 * Parameters for AddGift proxy generation
 */
export interface AddGiftProxyParams extends BaseProxyParams {
  /** Raffle ID */
  raffleId: string;
  /** Winner index to receive the gift */
  winnerIndex: number;
  /** Gift giver address */
  giftGiverAddress: string;
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
