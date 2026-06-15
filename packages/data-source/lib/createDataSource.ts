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
  RaffleView,
  ActivityView,
  ActivityWithTimeView,
  WinnerView,
  migrations as dbViewMigrations,
} from '@ergo-raffle/db-views';
import {
  DynamicBoxEntity,
  migrations as dynamicBoxMigrations,
} from '@ergo-raffle/dynamic-extractor';
import {
  ServiceEntity,
  InactiveRaffleEntity,
  RaffleBoxEntity,
  WinnerEntity,
  RaffleDetailsEntity,
  GiftEntity,
  TicketEntity,
  WinnerPrizeEntity,
  GiftRedeemEntity,
  SuccessRaffleEntity,
  TicketRedeemEntity,
  SafePayEntity,
  CreationProxyEntity,
  DonationProxyEntity,
  AddGiftProxyEntity,
  TagEntity,
  migrations as extractorsMigrations,
} from '@ergo-raffle/extractors';
import {
  DonationParamsEntity,
  migrations as requestParamsMigrations,
} from '@ergo-raffle/request-params';
import {
  RaffleSocialPostEntity,
  SocialPollCursorEntity,
  migrations as socialMigrations,
} from '@ergo-raffle/social';
import {
  TokenEntity,
  migrations as tokensMigrations,
} from '@ergo-raffle/tokens';

import type { DatabaseConfig } from './config.js';

const ENTITIES = [
  BlockEntity,
  ExtractorStatusEntity,
  ServiceEntity,
  InactiveRaffleEntity,
  RaffleBoxEntity,
  WinnerEntity,
  RaffleDetailsEntity,
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
  TokenEntity,
  CreationProxyEntity,
  DonationProxyEntity,
  AddGiftProxyEntity,
  RaffleView,
  ActivityView,
  ActivityWithTimeView,
  WinnerView,
  TagEntity,
  RaffleSocialPostEntity,
  SocialPollCursorEntity,
];

const MIGRATIONS = {
  sqlite: [
    ...scannerMigrations.sqlite,
    ...txpotMigrations.sqlite,
    ...extractorsMigrations.sqlite,
    ...requestParamsMigrations.sqlite,
    ...tokensMigrations.sqlite,
    ...dynamicBoxMigrations.sqlite,
    ...dbViewMigrations.sqlite,
    ...socialMigrations.sqlite,
  ],
  postgres: [
    ...scannerMigrations.postgres,
    ...txpotMigrations.postgres,
    ...extractorsMigrations.postgres,
    ...requestParamsMigrations.postgres,
    ...tokensMigrations.postgres,
    ...dynamicBoxMigrations.postgres,
    ...dbViewMigrations.postgres,
    ...socialMigrations.postgres,
  ],
};

/**
 * Creates a DataSource from database configuration.
 * Including all entities and migrations for raffle services
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
