import { Migration1776258384966 } from './postgres/1776258384966-migration';
import { Migration1776258338343 } from './sqlite/1776258338343-migration';

export const migrations = {
  sqlite: [Migration1776258338343],
  postgres: [Migration1776258384966],
};
