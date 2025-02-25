// sqlite migrations
import { Sqlite1739696777998 } from '../migrations/sqlite/1739696777998-sqlite';
import { Sqlite1739712232959 } from '../migrations/sqlite/1739712232959-sqlite';
import { Sqlite1739716606607 } from '../migrations/sqlite/1739716606607-sqlite';
import { Sqlite1739776460056 } from '../migrations/sqlite/1739776460056-sqlite';
import { Sqlite1739779028617 } from '../migrations/sqlite/1739779028617-sqlite';
// postgres migrations
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';
import { Postgres1739711065101 } from '../migrations/postgres/1739711065101-postgres';
import { Postgres1739716652155 } from '../migrations/postgres/1739716652155-postgres';
import { Postgres1739776466062 } from '../migrations/postgres/1739776466062-postgres';
import { Postgres1739779034480 } from '../migrations/postgres/1739779034480-postgres';

export const migrations = {
  sqlite: [
    Sqlite1739696777998,
    Sqlite1739712232959,
    Sqlite1739716606607,
    Sqlite1739776460056,
    Sqlite1739779028617,
  ],
  postgres: [
    Postgres1739623115850,
    Postgres1739711065101,
    Postgres1739716652155,
    Postgres1739776466062,
    Postgres1739779034480,
  ],
};
