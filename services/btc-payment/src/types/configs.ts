export interface BtcPaymentConfig {
  donation: Donation;
  bitcoin: Bitcoin;
  ergo: Ergo;
  api: Api;
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

export interface Api {
  host: string;
  port: number;
}

export interface Ergo {
  mnemonic: string;
  fee: bigint;
  nodeUrl: string;
  network: 'mainnet' | 'testnet';
}

export interface Bitcoin {
  mnemonic: string;
  network: 'mainnet' | 'testnet';
  rpc: BitcoinRpc;
  scannerInterval: number;
  initialHeight: number;
  runes: BitcoinRunes;
}

export interface BitcoinRunes {
  unisat: BitcoinRunesUnisat;
}

export interface BitcoinRunesUnisat {
  url: string;
  apiKey?: string;
}

export interface BitcoinRpc {
  url: string;
  timeout: number;
  username?: string;
  password?: string;
}

export interface Donation {
  interval: number;
  requiredConfirmations: number;
  requestTimeout: number;
}
