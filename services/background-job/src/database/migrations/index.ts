import { Sqlite1765799182751 } from './sqlite/1765799182751-sqlite';
import { Postgres1765799319935 } from './postgres/1765799319935-postgres';

export const migrations = {
  sqlite: [Sqlite1765799182751],
  postgres: [Postgres1765799319935],
};
