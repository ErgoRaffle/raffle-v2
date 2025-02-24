import { Postgres1739623115850 } from './postgres/1739623115850-postgres';
import { Sqlite1739696777998 } from './sqlite/1739696777998-sqlite';

export const migrations = {
  sqlite: [Sqlite1739696777998],
  postgres: [Postgres1739623115850],
};
