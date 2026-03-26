import { Migration1774517005522 } from './postgres/1774517005522-migration';
import { Migration1774515539078 } from './sqlite/1774515539078-migration';

export const migrations = {
  sqlite: [Migration1774515539078],
  postgres: [Migration1774517005522],
};
