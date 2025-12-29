import { Postgres1765799319935 } from './postgres/postgres1765799319935';
import { Sqlite1765799182751 } from './sqlite/sqlite1765799182751';

export const migrations = {
  sqlite: [Sqlite1765799182751],
  postgres: [Postgres1765799319935],
};
