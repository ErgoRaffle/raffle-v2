import { Migration1781568000000 } from './postgres/1781568000000-migration';
import { Migration1781568000001 } from './sqlite/1781568000001-migration';

export const migrations = {
  postgres: [Migration1781568000000],
  sqlite: [Migration1781568000001],
};
