export interface BackgroundJobConfig {
  addresses: Addresses;
  tokenDetails: TokenDetails;
  boxLookup: BoxLookup;
  notification: Notification;
  healthCheck: HealthCheck;
  ergo: Ergo;
  txpot: Txpot;
  scanner: Scanner;
  database: Database;
  logs: Logs[];
  ipfs: Ipfs;
  social: Social;
}

export interface Social {
  /** Active mentions data source. Default 'thirdparty'. */
  provider: 'official' | 'thirdparty';
  /** Seconds between polls. Default 1800 (30 min). */
  pollInterval: number;
  /** @ergoraffle handle without '@' (used in the mention check and third-party search). */
  handle: string;
  /** Numeric X user id of @ergoraffle whose mentions we poll (official API). Deferred. */
  userId: string;
  /** Allow-listed hosts a raffle URL may use; exact or "*.domain" wildcard entries. */
  allowHosts: string[];
  official: SocialOfficial;
  thirdparty: SocialThirdParty;
  filters: SocialFilters;
}

export interface SocialOfficial {
  /** X API v2 app bearer token. Deferred (secret). */
  bearerToken: string;
  /** Max pages followed per tick (cost cap). */
  maxPages: number;
}

export interface SocialThirdParty {
  /** twitterapi.io API key. Deferred (secret). */
  apiKey: string;
  /** Max pages followed per tick (cost cap). */
  maxPages: number;
}

export interface SocialFilters {
  /** Lower-cased substrings; a tweet whose text contains any is dropped. */
  keywords: string[];
  /** Minimum author account age, in days. */
  minAccountAgeDays: number;
  /** Minimum author follower count. */
  minFollowers: number;
  /** Max posts from one author on one raffle. */
  maxPerAuthorPerRaffle: number;
}

export interface Logs {
  type: 'file' | 'console' | 'loki';
  maxSize?: string;
  maxFiles?: string;
  path?: string;
  level: string;
  serviceName?: string;
  host?: string;
  basicAuth?: string;
}

export interface Database {
  type: 'sqlite' | 'postgres';
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  name?: string;
  path?: string;
}

export interface Scanner {
  node: ScannerNode;
  scannerInterval: number;
}

export interface ScannerNode {
  url: string;
  timeout: number;
  initialHeight: number;
}

export interface Txpot {
  updateInterval: number;
  txRequiredConfirmations: number;
}

export interface Ergo {
  fee: bigint;
}

export interface HealthCheck {
  updateInterval: number;
  warnBlockGap: number;
  criticalBlockGap: number;
}

export interface Notification {
  discordWebHookUrl?: string;
  historyCleanupTimeout?: number;
  hasBeenUnstableForAWhileWindowDuration?: number;
  hasBeenUnknownForAWhileWindowDuration?: number;
}

export interface BoxLookup {
  updateInterval: number;
}

export interface TokenDetails {
  updateInterval: number;
}

export interface Addresses {
  serviceFeeAddress: string;
}

export interface Ipfs {
  accessKey: string;
  secretKey: string;
  bucket: string;
}
