import { DataSource } from 'typeorm';
import { MockChain } from '@fleet-sdk/mock-chain';

import {
  BlockEntity,
  ExtractorStatusEntity,
  migrations as scannerMigrations,
} from '@rosen-bridge/scanner';

import { migrations } from '../lib/migrations';
import {
  RaffleServiceEntity,
  RaffleEntity,
  BoxEntity,
  WinnerEntity,
  RaffleDetailsEntity,
  PictureEntity,
  GiftEntity,
} from '../lib/entities';

const chain = new MockChain(1);
export const serviceWallet = chain.addParty(
  '0008cd028a1d214ea0ddbae5a2304cd1f4870e6bd2b38e6b71caa0c943a9780a21c45cdb',
  'service',
);
export const implementerWallet = chain.addParty(
  '0008cd02f715df779699555ed7febbfb34b16e2844ad6040a7e455f3c3cbc6debed33f36',
  'implementer',
);
export const creatorWallet = chain.addParty(
  '0008cd02d9d15a5f83022a63614d1761f0f4bbd6bf5d01906c78b3f06cd02ede7ba76b2c',
  'creator',
);

/**
 * generate dataSource and related database
 *  used for test datasource
 */
export const createDatabase = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: `:memory:`,
    dropSchema: true,
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
    ],
    migrations: [...migrations.sqlite, ...scannerMigrations.sqlite],
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};

/**
 * get a number and return equal Uint8Array
 * @param num
 */
export function bigIntToUint8Array(num: bigint) {
  const b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0, num);
  return new Uint8Array(b);
}
