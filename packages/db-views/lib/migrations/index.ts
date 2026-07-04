import { Migration1779515822570 } from './postgres/1779515822570-migration';
import { Migration1783159714000 } from './postgres/1783159714000-migration';
import { Migration1783160686554 } from './postgres/1783160686554-migration';
import { Migration1779515864558 } from './sqlite/1779515864558-migration';
import { Migration1783159837000 } from './sqlite/1783159837000-migration';
import { Migration1783160465786 } from './sqlite/1783160465786-migration';

export const migrations = {
  postgres: [
    Migration1779515822570,
    Migration1783159714000,
    Migration1783160686554,
  ],
  sqlite: [
    Migration1779515864558,
    Migration1783159837000,
    Migration1783160465786,
  ],
};
