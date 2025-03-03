// sqlite migrations
import { Sqlite1739696777998 } from '../migrations/sqlite/1739696777998-sqlite';
import { Sqlite1740392232959 } from '../migrations/sqlite/1740392232959-sqlite';
import { Sqlite1740496804795 } from '../migrations/sqlite/1740496804795-sqlite';
// postgres migrations
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';
import { Postgres1740392065101 } from '../migrations/postgres/1740392065101-postgres';
import { Postgres1740497015349 } from '../migrations/postgres/1740497015349-postgres';

export const migrations = {
  sqlite: [Sqlite1739696777998, Sqlite1740392232959, Sqlite1740496804795],
  postgres: [
    Postgres1739623115850,
    Postgres1740392065101,
    Postgres1740497015349,
  ],
};
