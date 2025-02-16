// sqlite migrations
import { Sqlite1739696777998 } from '../migrations/sqlite/1739696777998-sqlite';
import { Sqlite1739711375567 } from '../migrations/sqlite/1739711375567-sqlite';
import { Sqlite1739716606607 } from '../migrations/sqlite/1739716606607-sqlite';
// postgres migrations
import { Postgres1739623115850 } from '../migrations/postgres/1739623115850-postgres';
import { Postgres1739711977993 } from '../migrations/postgres/1739711977993-postgres';
import { Postgres1739716652155 } from '../migrations/postgres/1739716652155-postgres';

export const migrations = {
  sqlite: [Sqlite1739696777998, Sqlite1739711375567, Sqlite1739716606607],
  postgres: [
    Postgres1739623115850,
    Postgres1739711977993,
    Postgres1739716652155,
  ],
};
