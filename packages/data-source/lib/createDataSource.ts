import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/abstract-scanner';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  TransactionEntity,
  migrations as txpotMigrations,
} from '@rosen-bridge/tx-pot';

import {
  ServiceEntity,
  InactiveRaffleEntity,
  RaffleBoxEntity,
  WinnerEntity,
  RaffleDetailsEntity,
  PictureEntity,
  GiftEntity,
  TicketEntity,
  WinnerPrizeEntity,
  GiftRedeemEntity,
  SuccessRaffleEntity,
  TicketRedeemEntity,
  SafePayEntity,
  DynamicBoxEntity,
  migrations as extractorsMigrations,
} from '@ergo-raffle/extractors';
import {
  DonationParamsEntity,
  migrations as requestParamsMigrations,
} from '@ergo-raffle/request-params';

import type { DatabaseConfig } from './config.js';

const ENTITIES = [
  BlockEntity,
  ExtractorStatusEntity,
  ServiceEntity,
  InactiveRaffleEntity,
  RaffleBoxEntity,
  WinnerEntity,
  RaffleDetailsEntity,
  PictureEntity,
  GiftEntity,
  TicketEntity,
  WinnerPrizeEntity,
  GiftRedeemEntity,
  SuccessRaffleEntity,
  TicketRedeemEntity,
  SafePayEntity,
  TransactionEntity,
  DynamicBoxEntity,
  DonationParamsEntity,
];

const MIGRATIONS = {
  sqlite: [
    ...scannerMigrations.sqlite,
    ...txpotMigrations.sqlite,
    ...extractorsMigrations.sqlite,
    ...requestParamsMigrations.sqlite,
  ],
  postgres: [
    ...scannerMigrations.postgres,
    ...txpotMigrations.postgres,
    ...extractorsMigrations.postgres,
    ...requestParamsMigrations.postgres,
  ],
};

/**
 * Creates a DataSource from database configuration.
 * Entities and migrations are fixed for the raffle background-job.
 */
export function createDataSource(config: DatabaseConfig): DataSource {
  const common = {
    entities: ENTITIES,
    synchronize: false,
    logging: false,
  };

  if (config.type === 'sqlite') {
    return new DataSource({
      type: 'sqlite',
      database: config.path!,
      migrations: MIGRATIONS.sqlite,
      ...common,
    });
  }

  return new DataSource({
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.name,
    migrations: MIGRATIONS.postgres,
    ...common,
  });
}
