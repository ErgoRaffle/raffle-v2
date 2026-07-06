import { Migration1774542877898 } from './postgres/1774542877898-migration';
import { Migration1783159714890 } from './postgres/1783159714890-migration';
import { Migration1774542753390 } from './sqlite/1774542753390-migration';
import { Migration1783159837485 } from './sqlite/1783159837485-migration';

export const migrations = {
  sqlite: [Migration1774542753390, Migration1783159837485],
  postgres: [Migration1774542877898, Migration1783159714890],
};
