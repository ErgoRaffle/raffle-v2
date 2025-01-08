import { Sqlite1736256487736 } from '../migrations/sqlite/1736256487736-sqlite';
import { Postgres1736256482771 } from '../migrations/postgres/1736256482771-postgres';

export const migrations = {
  sqlite: [Sqlite1736256487736],
  postgres: [Postgres1736256482771],
};
