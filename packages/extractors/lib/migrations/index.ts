// sqlite migrations
import { Sqlite1739696777998 } from '../migrations/sqlite/1739696777998-sqlite';
import { Sqlite1740392232959 } from '../migrations/sqlite/1740392232959-sqlite';
import { Sqlite1740496804795 } from '../migrations/sqlite/1740496804795-sqlite';
import { Sqlite1739776460056 } from '../migrations/sqlite/1739776460056-sqlite';
import { Sqlite1739779028617 } from '../migrations/sqlite/1739779028617-sqlite';
import { Sqlite1739856561630 } from '../migrations/sqlite/1739856561630-sqlite';
// postgres migrations
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';
import { Postgres1740392065101 } from '../migrations/postgres/1740392065101-postgres';
import { Postgres1740497015349 } from '../migrations/postgres/1740497015349-postgres';
import { Postgres1739776466062 } from '../migrations/postgres/1739776466062-postgres';
import { Postgres1739779034480 } from '../migrations/postgres/1739779034480-postgres';
import { Postgres1739856465885 } from '../migrations/postgres/1739856465885-postgres';

export const migrations = {
  sqlite: [
    Sqlite1739696777998,
    Sqlite1740392232959,
    Sqlite1740496804795,
    Sqlite1739776460056,
    Sqlite1739779028617,
    Sqlite1739856561630,
  ],
  postgres: [
    Postgres1739623115850,
    Postgres1740392065101,
    Postgres1740497015349,
    Postgres1739776466062,
    Postgres1739779034480,
    Postgres1739856465885,
  ],
};
