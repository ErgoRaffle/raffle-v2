import { DataSource } from 'typeorm';

import { migrations as scannerMigrations } from '@rosen-bridge/scanner';

import { migrations } from '../lib/migrations';
import { RaffleService, InactiveRaffle } from '../lib/entities';

/**
 * generate dataSource and related database
 *  used for test datasource
 * @param name
 */
export const createDatabase = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: `:memory:`,
    dropSchema: true,
    entities: [RaffleService, InactiveRaffle],
    migrations: [...migrations.sqlite, ...scannerMigrations.sqlite],
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};
