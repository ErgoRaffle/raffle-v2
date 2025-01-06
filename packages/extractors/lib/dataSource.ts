import { DataSource } from 'typeorm';
import 'reflect-metadata';
import { RaffleService } from './entities/raffleService';

import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/scanner';
import { Sqlite1736162463033 } from './migrations/sqlite/1736162463033-sqlite';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'raffle.sqlite3',
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
  entities: [BlockEntity, ExtractorStatusEntity, RaffleService],
  migrations: [Sqlite1736162463033, ...scannerMigrations['sqlite']],
});
