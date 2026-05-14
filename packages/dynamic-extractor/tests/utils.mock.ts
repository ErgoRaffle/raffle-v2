import { DataSource } from '@rosen-bridge/extended-typeorm';

import { DynamicBoxEntity } from '../lib';

/**
 * Create an in-memory SQLite DataSource for DynamicExtractor tests.
 * Uses synchronize to create tables from entities.
 */
export const createDatabase = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    entities: [DynamicBoxEntity],
    synchronize: true,
    logging: false,
  });
  await dataSource.initialize();
  return dataSource;
};
