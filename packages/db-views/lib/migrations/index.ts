import { Migration1779515822570 } from './postgres/1779515822570-migration';
import { Migration1779515864558 } from './sqlite/1779515864558-migration';

export const migrations = {
  postgres: [Migration1779515822570],
  sqlite: [Migration1779515864558],
};
