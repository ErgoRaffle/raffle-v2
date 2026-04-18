import { Migration1776857449078 } from './postgres/1776857449078-migration';
import { Migration1776857475311 } from './sqlite/1776857475311-migration';

export const migrations = {
  sqlite: [Migration1776857475311],
  postgres: [Migration1776857449078],
};
