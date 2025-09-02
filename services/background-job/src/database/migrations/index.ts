import { Postgres1756629990732 } from './postgres/postgres1756629990732';
import { Sqlite1756562925822 } from './sqlite/1756562925822-sqlite';

export const migrations = {
  sqlite: [Sqlite1756562925822],
  postgres: [Postgres1756629990732],
};
