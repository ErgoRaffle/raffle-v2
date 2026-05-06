import { Migration1778080529546 } from './postgres/1778080529546-migration';
import { Migration1778079432469 } from './sqlite/1778079432469-migration';

export const migrations = {
  sqlite: [Migration1778079432469],
  postgres: [Migration1778080529546],
};
