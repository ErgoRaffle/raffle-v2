export interface BackgroundJobConfig {
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
  node: Node;
  rescanDelaySeconds: number;
}

export interface Node {
  url: string;
  timeout: number;
  initialHeight: number;
}

export interface Txpot {
  updateInterval: number;
  txRequiredConfirmations: number;
}

export interface Ergo {
  fee?: number;
  network?: 'mainnet' | 'testnet';
}
