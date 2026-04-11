import { Migration1775715041271 } from './postgres/1775715041271-migration';
import { Migration1775712580463 } from './sqlite/1775712580463-migration';

export const migrations = {
  sqlite: [Migration1775712580463],
  postgres: [Migration1775715041271],
};
