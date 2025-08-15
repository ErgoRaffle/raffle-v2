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
} from '@ergo-raffle/extractors';
import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/scanner';
import { migrations } from '@ergo-raffle/extractors';
import {
  TransactionEntity,
  migrations as txpotMigrations,
} from '@rosen-bridge/tx-pot';

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
  ],
  synchronize: false,
  logging: false,
};
let dataSource: DataSource;
if (dbConfigs.type === 'sqlite') {
  dataSource = new DataSource({
    type: 'sqlite',
    migrations: [
      ...migrations.sqlite,
      ...scannerMigrations.sqlite,
      ...txpotMigrations.sqlite,
    ],
    database: dbConfigs.path!,
    ...commonConfigs,
  });
} else {
  dataSource = new DataSource({
    type: 'postgres',
    migrations: [
      ...migrations.postgres,
      ...scannerMigrations.postgres,
      ...txpotMigrations.postgres,
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
