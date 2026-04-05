import { Migration1772393782627 } from './postgres/1772393782627-migration';
import { Migration1775417802338 } from './postgres/1775417802338-migration';
import { Migration1772390164875 } from './sqlite/1772390164875-migration';
import { Migration1775412870448 } from './sqlite/1775412870448-migration';

export const migrations = {
  sqlite: [Migration1772390164875, Migration1775412870448],
  postgres: [Migration1772393782627, Migration1775417802338],
};
