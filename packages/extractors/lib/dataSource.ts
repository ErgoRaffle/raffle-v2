import { DataSource } from 'typeorm';
import 'reflect-metadata';
import { Raffle } from './entities/raffle';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'raffle.sqlite3',
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
  entities: [Raffle],
});

export { AppDataSource };
