import { Migration1778505562627 } from './postgres/1778505562627-migration';
import { Migration1778505512467 } from './sqlite/1778505512467-migration';

export const migrations = {
  sqlite: [Migration1778505512467],
  postgres: [Migration1778505562627],
};
