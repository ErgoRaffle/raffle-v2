// sqlite migrations
import { Sqlite1736703916775 } from '../migrations/sqlite/1736703916775-sqlite';
import { Sqlite1736705562548 } from '../migrations/sqlite/1736705562548-sqlite';
// postgres migrations
import { Postgres1736703911798 } from '../migrations/postgres/1736703911798-postgres';
import { Postgres1736705568860 } from '../migrations/postgres/1736705568860-postgres';

export const migrations = {
  sqlite: [Sqlite1736703916775, Sqlite1736705562548],
  postgres: [Postgres1736703911798, Postgres1736705568860],
};
