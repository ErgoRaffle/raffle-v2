import { Sqlite1736599914434 } from '../migrations/sqlite/1736599914434-sqlite';
import { Postgres1736599984267 } from '../migrations/postgres/1736599984267-postgres';

export const migrations = {
  sqlite: [Sqlite1736599914434],
  postgres: [Postgres1736599984267],
};
