export interface BackgroundJobConfig {
  addresses: Addresses;
  boxLookup: BoxLookup;
  notification: Notification;
  healthCheck: HealthCheck;
  ergo: Ergo;
  txpot: Txpot;
  scanner: Scanner;
  database: Database;
  logs: Logs[];
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

export interface Addresses {
  serviceFeeAddress: string;
}
