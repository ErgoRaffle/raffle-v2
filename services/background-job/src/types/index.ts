import {
  RaffleServiceEntity,
  RaffleEntity,
  BoxEntity,
  WinnerEntity,
  RaffleDetailsEntity,
  GiftEntity,
  TicketEntity,
  WinnerPrizeEntity,
  GiftRedeemEntity,
  SuccessRaffleEntity,
  TicketRedeemEntity,
  SafePayEntity,
} from '@ergo-raffle/extractors/lib/entities';

export type RaffleEntitiesType =
  | RaffleServiceEntity
  | BoxEntity
  | WinnerEntity
  | RaffleDetailsEntity
  | GiftEntity
  | TicketEntity
  | WinnerPrizeEntity
  | GiftRedeemEntity
  | SuccessRaffleEntity
  | TicketRedeemEntity
  | SafePayEntity
  | RaffleEntity;

interface SqliteDataBaseOption {
  type: 'sqlite';
  path: string;
}

interface PostgresDataBaseOption {
  type: 'postgres';
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
}

export type DataBaseOption = SqliteDataBaseOption | PostgresDataBaseOption;
