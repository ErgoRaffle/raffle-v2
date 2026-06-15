import { DataSource } from '@rosen-bridge/extended-typeorm';

import {
  RaffleSocialPostEntity,
  SocialPollCursorEntity,
  migrations,
} from '../lib';

/**
 * Build an in-memory sqlite DataSource with the social entities + sqlite migrations.
 * Mirrors the repo's test-database pattern (see extractors/tests/utils.mock.ts).
 */
export const createDatabase = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    entities: [RaffleSocialPostEntity, SocialPollCursorEntity],
    migrations: [...migrations.sqlite],
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};
