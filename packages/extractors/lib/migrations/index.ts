import { Sqlite1736703916775 } from '../migrations/sqlite/1736703916775-sqlite';
import { Postgres1736703911798 } from '../migrations/postgres/1736703911798-postgres';

export const migrations = {
  sqlite: [Sqlite1736703916775],
  postgres: [Postgres1736703911798],
};
