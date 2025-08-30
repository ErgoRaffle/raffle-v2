import { DataSource } from '@rosen-bridge/extended-typeorm';

import { configs } from './config';

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
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/scanner';
import {
  TransactionEntity,
  migrations as txpotMigrations,
} from '@rosen-bridge/tx-pot';
import {
  CreationParamsEntity,
  CreationPictureEntity,
  AddGiftParamsEntity,
  DonationParamsEntity,
} from './database/entities';
import { migrations } from './database/migrations';

const dbConfigs = configs.database;

const commonConfigs = {
  entities: [
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
    CreationParamsEntity,
    CreationPictureEntity,
    AddGiftParamsEntity,
    DonationParamsEntity,
  ],
  synchronize: false,
  logging: false,
};
let dataSource: DataSource;
if (dbConfigs.type === 'sqlite') {
  dataSource = new DataSource({
    type: 'sqlite',
    migrations: [
      ...scannerMigrations.sqlite,
      ...txpotMigrations.sqlite,
      ...extractorsMigrations.sqlite,
      ...migrations.sqlite,
    ],
    database: dbConfigs.path!,
    ...commonConfigs,
  });
} else {
  dataSource = new DataSource({
    type: 'postgres',
    migrations: [
      ...scannerMigrations.postgres,
      ...txpotMigrations.postgres,
      ...extractorsMigrations.postgres,
      ...migrations.postgres,
    ],
    host: dbConfigs.host,
    port: dbConfigs.port,
    username: dbConfigs.username,
    password: dbConfigs.password,
    database: dbConfigs.name,
    ...commonConfigs,
  });
}

export default dataSource;
