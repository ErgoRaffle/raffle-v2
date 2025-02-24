// Postgres Migrations
import { Postgres1739623115850 } from './postgres/1739623115850-postgres';
import { Postgres1740392065101 } from './postgres/1740392065101-postgres';
// Sqlite Migrations
import { Sqlite1739696777998 } from './sqlite/1739696777998-sqlite';
import { Sqlite1740392232959 } from './sqlite/1740392232959-sqlite';

export const migrations = {
  sqlite: [Sqlite1739696777998, Sqlite1740392232959],
  postgres: [Postgres1739623115850, Postgres1740392065101],
};
