import './bootstrap';

import startApp from './app';

import { dataSource } from './dataSources/sqlite';

const main = async () => {
  await dataSource.initialize();
  await dataSource.runMigrations();
  startApp();
};

main();
