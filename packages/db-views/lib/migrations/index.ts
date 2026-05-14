import { Migration1778747759590 } from './postgres/1778747759590-migration';
import { Migration1778747790627 } from './sqlite/1778747790627-migration';

export const migrations = {
  sqlite: [Migration1778747790627],
  postgres: [Migration1778747759590],
};
