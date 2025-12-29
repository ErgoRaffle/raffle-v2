import { Postgres1765798163301 } from './postgres/postgres1765798163301';
import { Sqlite1765798898052 } from './sqlite/sqlite1765798898052';

export const migrations = {
  sqlite: [Sqlite1765798898052],
  postgres: [Postgres1765798163301],
};
