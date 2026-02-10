import { Postgres1765798163301 } from './postgres/1765798163301-migration';
import { Sqlite1765798898052 } from './sqlite/1765798898052-migration';

export const migrations = {
  sqlite: [Sqlite1765798898052],
  postgres: [Postgres1765798163301],
};
