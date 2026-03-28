import { Migration1774542877898 } from './postgres/1774542877898-migration';
import { Migration1774542753390 } from './sqlite/1774542753390-migration';

export const migrations = {
  sqlite: [Migration1774542753390],
  postgres: [Migration1774542877898],
};
