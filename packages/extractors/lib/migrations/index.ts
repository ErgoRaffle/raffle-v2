// sqlite migrations
import { Sqlite1739696777998 } from '../migrations/sqlite/1739696777998-sqlite';
import { Sqlite1739712232959 } from '../migrations/sqlite/1739712232959-sqlite';
import { Sqlite1740496804795 } from '../migrations/sqlite/1740496804795-sqlite';
import { Sqlite1739776460056 } from '../migrations/sqlite/1739776460056-sqlite';
import { Sqlite1739779028617 } from '../migrations/sqlite/1739779028617-sqlite';
import { Sqlite1739856561630 } from '../migrations/sqlite/1739856561630-sqlite';
import { Sqlite1739868074824 } from '../migrations/sqlite/1739868074824-sqlite';
import { Sqlite1739877562133 } from '../migrations/sqlite/1739877562133-sqlite';
import { Sqlite1740812389338 } from '../migrations/sqlite/1740812389338-sqlite';
import { Sqlite1740814926217 } from '../migrations/sqlite/1740814926217-sqlite';
import { Sqlite1740823109653 } from '../migrations/sqlite/1740823109653-sqlite';
// postgres migrations
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';
import { Postgres1739711065101 } from '../migrations/postgres/1739711065101-postgres';
import { Postgres1740497015349 } from '../migrations/postgres/1740497015349-postgres';
import { Postgres1739776466062 } from '../migrations/postgres/1739776466062-postgres';
import { Postgres1739779034480 } from '../migrations/postgres/1739779034480-postgres';
import { Postgres1739856465885 } from '../migrations/postgres/1739856465885-postgres';
import { Postgres1739868080327 } from '../migrations/postgres/1739868080327-postgres';
import { Postgres1739877568072 } from '../migrations/postgres/1739877568072-postgres';
import { Postgres1740812408283 } from '../migrations/postgres/1740812408283-postgres';
import { Postgres1740815102615 } from '../migrations/postgres/1740815102615-postgres';
import { Postgres1740823115639 } from '../migrations/postgres/1740823115639-postgres';

export const migrations = {
  sqlite: [
    Sqlite1739696777998,
    Sqlite1739712232959,
    Sqlite1740496804795,
    Sqlite1739776460056,
    Sqlite1739779028617,
    Sqlite1739856561630,
    Sqlite1739868074824,
    Sqlite1739877562133,
    Sqlite1740812389338,
    Sqlite1740814926217,
    Sqlite1740823109653,
  ],
  postgres: [
    Postgres1739623115850,
    Postgres1739711065101,
    Postgres1740497015349,
    Postgres1739776466062,
    Postgres1739779034480,
    Postgres1739856465885,
    Postgres1739868080327,
    Postgres1739877568072,
    Postgres1740812408283,
    Postgres1740815102615,
    Postgres1740823115639,
  ],
};
