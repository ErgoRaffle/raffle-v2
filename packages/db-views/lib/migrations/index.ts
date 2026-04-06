import { Migration1775456488604 } from './postgres/1775456488604-migration';
import { Migration1775456264404 } from './sqlite/1775456264404-migration';

export const migrations = {
  sqlite: [Migration1775456264404],
  postgres: [Migration1775456488604],
};
