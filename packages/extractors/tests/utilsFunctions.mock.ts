import { DataSource } from 'typeorm';

import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/scanner';

import { migrations } from '../lib/migrations';
import {
  RaffleService,
  InactiveRaffle,
  ActiveRaffle,
  TicketRepo,
  GiftTokenRepo,
  Winner,
  RaffleDetails,
  Picture,
  Gift,
  Ticket,
} from '../lib/entities';

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
    entities: [
      BlockEntity,
      ExtractorStatusEntity,
      RaffleService,
      InactiveRaffle,
      ActiveRaffle,
      TicketRepo,
      GiftTokenRepo,
      Winner,
      RaffleDetails,
      Picture,
      Gift,
      Ticket,
    ],
    migrations: [...migrations.sqlite, ...scannerMigrations.sqlite],
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};
