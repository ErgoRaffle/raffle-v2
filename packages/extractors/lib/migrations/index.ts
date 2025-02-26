// sqlite migrations
import { Sqlite1739696777998 } from '../migrations/sqlite/1739696777998-sqlite';
import { Sqlite1739712232959 } from '../migrations/sqlite/1739712232959-sqlite';
import { Sqlite1740496804795 } from '../migrations/sqlite/1740496804795-sqlite';
import { Sqlite1739776460056 } from '../migrations/sqlite/1739776460056-sqlite';
// postgres migrations
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';
import { Postgres1739711065101 } from '../migrations/postgres/1739711065101-postgres';
import { Postgres1740497015349 } from '../migrations/postgres/1740497015349-postgres';
import { Postgres1739776466062 } from '../migrations/postgres/1739776466062-postgres';

export const migrations = {
  sqlite: [
    Sqlite1739696777998,
    Sqlite1739712232959,
    Sqlite1740496804795,
    Sqlite1739776460056,
  ],
  postgres: [
    Postgres1739623115850,
    Postgres1739711065101,
    Postgres1740497015349,
    Postgres1739776466062,
  ],
};
