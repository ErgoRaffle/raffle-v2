export interface ApiConfig {
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
