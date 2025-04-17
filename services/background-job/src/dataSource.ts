import { DataSource } from '@rosen-bridge/extended-typeorm';
import { getConfig } from './config/config';

import {
  RaffleServiceEntity,
  RaffleEntity,
  BoxEntity,
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
} from '@ergo-raffle/extractors';
import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/scanner';
import { migrations } from '@ergo-raffle/extractors';

const dbConfigs = getConfig().database;

const commonConfigs = {
  entities: [
    BlockEntity,
    ExtractorStatusEntity,
    RaffleServiceEntity,
    RaffleEntity,
    BoxEntity,
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
  ],
  synchronize: false,
  logging: false,
};
let dataSource: DataSource;
if (dbConfigs.type === 'sqlite') {
  dataSource = new DataSource({
    type: 'sqlite',
    migrations: [...migrations.sqlite, ...scannerMigrations.sqlite],
    database: dbConfigs.path,
    ...commonConfigs,
  });
} else {
  dataSource = new DataSource({
    type: 'postgres',
    migrations: [...migrations.postgres, ...scannerMigrations.postgres],
    host: dbConfigs.host,
    port: dbConfigs.port,
    username: dbConfigs.user,
    password: dbConfigs.password,
    database: dbConfigs.name,
    ...commonConfigs,
  });
}

export default dataSource;
