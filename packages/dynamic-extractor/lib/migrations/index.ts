import { Migration1773447357104 } from './postgres/1773447357104-migration';
import { Migration1773446916572 } from './sqlite/1773446916572-migration';

export const migrations = {
  sqlite: [Migration1773446916572],
  postgres: [Migration1773447357104],
};
