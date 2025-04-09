import config from 'config';
import { DataSource } from 'typeorm';
import { DataBaseOption } from './types';

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
} from '@ergo-raffle/extractors/lib/entities';
import { migrations } from '@ergo-raffle/extractors';

const dbConfigs = config.get<DataBaseOption>('database');
const commonConfigs = {
  entities: [
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
if (dbConfigs.type === 'sqlite' && dbConfigs.path != undefined) {
  dataSource = new DataSource({
    type: 'sqlite',
    migrations: migrations['sqlite'],
    database: dbConfigs.path,
    ...commonConfigs,
  });
} else if (dbConfigs.type === 'postgres') {
  dataSource = new DataSource({
    type: 'postgres',
    migrations: migrations['postgres'],
    host: dbConfigs.host,
    port: dbConfigs.port,
    username: dbConfigs.user,
    password: dbConfigs.password,
    database: dbConfigs.name,
    ...commonConfigs,
  });
} else {
  throw new Error(`Database type=[${dbConfigs.type}] not supported`);
}

export default dataSource;
