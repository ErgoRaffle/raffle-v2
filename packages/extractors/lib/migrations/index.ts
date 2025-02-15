import { Sqlite1736703916775 } from '../migrations/sqlite/1736703916775-sqlite';
import { Postgres1739023898594 } from '../migrations/postgres/1739023898594-postgres';

export const migrations = {
  sqlite: [Sqlite1736703916775],
  postgres: [Postgres1739023898594],
};
