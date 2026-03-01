import { Migration1772393782627 } from './postgres/1772393782627-migration';
import { Migration1772390164875 } from './sqlite/1772390164875-migration';

export const migrations = {
  sqlite: [Migration1772390164875],
  postgres: [Migration1772393782627],
};
