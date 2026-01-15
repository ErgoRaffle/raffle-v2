/**
 * Base interface for all proxy generation parameters
 */
export interface BaseProxyParams {
  /** The proxy address that will be generated */
  proxyAddress?: string;
  /** Required nano ERGs for the transaction */
  requiredNanoErgs?: bigint;
}

/**
 * Parameters for Creation proxy generation
 */
export interface CreationProxyParams extends BaseProxyParams {
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
export interface DonationProxyParams extends BaseProxyParams {
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
export interface AddGiftProxyParams extends BaseProxyParams {
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
  /** Generated ErgoTree hash */
  ergoTree: string;
  /** Required nano ERGs */
  requiredNanoErgs: bigint;
  /** Additional required tokens (if any) */
  requiredTokens?: Array<{
    tokenId: string;
    amount: bigint;
  }>;
}

/**
 * ErgoScript contract template parameters
 */
export interface ErgoScriptParams {
  /** Contract-specific parameters */
  [key: string]: any;
}
