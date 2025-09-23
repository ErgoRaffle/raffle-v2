import { Postgres1756376732412 } from './postgres/1756376732412Postgres';
import { Sqlite1756562925822 } from './sqlite/1756562925822-sqlite';

export const migrations = {
  sqlite: [Sqlite1756562925822],
  postgres: [Postgres1756376732412],
};
