// sqlite migrations
import { Sqlite1736703916775 } from '../migrations/sqlite/1736703916775-sqlite';
import { Sqlite1739687566209 } from '../migrations/sqlite/1739687566209-sqlite';
// postgres migrations
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';
import { Postgres1739687572115 } from '../migrations/postgres/1739687572115-postgres';

export const migrations = {
  sqlite: [Sqlite1736703916775, Sqlite1739687566209],
  postgres: [Postgres1739623115850, Postgres1739687572115],
};
