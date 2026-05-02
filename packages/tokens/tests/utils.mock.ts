import { DataSource } from '@rosen-bridge/extended-typeorm';

import { TokenEntity, migrations } from '../lib';

export const createDatabase = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    entities: [TokenEntity],
    migrations: [...migrations.sqlite],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};
