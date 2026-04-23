import { DataSource } from '@rosen-bridge/extended-typeorm';

import {
  InactiveRaffleEntity,
  RaffleBoxEntity,
  WinnerEntity,
  RaffleDetailsEntity,
  GiftEntity,
  TicketEntity,
  WinnerPrizeEntity,
  migrations as extractorMigrations,
  SuccessRaffleEntity,
  GiftRedeemEntity,
} from '@ergo-raffle/extractors';
import {
  TokenEntity,
  migrations as tokenMigrations,
} from '@ergo-raffle/tokens';

import { RaffleView, UserActivityView, migrations } from '../lib';

export const createDatabase = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: `:memory:`,
    dropSchema: true,
    entities: [
      InactiveRaffleEntity,
      RaffleBoxEntity,
      WinnerEntity,
      RaffleDetailsEntity,
      GiftEntity,
      TicketEntity,
      WinnerPrizeEntity,
      RaffleView,
      UserActivityView,
      SuccessRaffleEntity,
      GiftRedeemEntity,
      TokenEntity,
    ],
    migrations: [
      ...extractorMigrations.sqlite,
      ...migrations.sqlite,
      ...tokenMigrations.sqlite,
    ],
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  await dataSource.synchronize();
  return dataSource;
};
