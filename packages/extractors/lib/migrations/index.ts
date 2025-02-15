import { Sqlite1736703916775 } from '../migrations/sqlite/1736703916775-sqlite';
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';

export const migrations = {
  sqlite: [Sqlite1736703916775],
  postgres: [Postgres1739623115850],
};
