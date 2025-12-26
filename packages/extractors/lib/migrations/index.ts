// sqlite migrations
import { Sqlite1765798898052 } from './sqlite/1765798898052-sqlite';
// postgres migrations
import { Postgres1765798163301 } from './postgres/1765798163301-postgres';

export const migrations = {
  sqlite: [Sqlite1765798898052],
  postgres: [Postgres1765798163301],
};
