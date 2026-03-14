import { DataSource } from '@rosen-bridge/extended-typeorm';

import { DynamicBoxEntity } from './entities';

// export const dataSource = new DataSource({
//   type: 'sqlite',
//   database: 'db.sqlite',
//   migrations: [],
//   entities: [DynamicBoxEntity],
// });

export const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'raffle',
  migrations: [],
  entities: [DynamicBoxEntity],
});
