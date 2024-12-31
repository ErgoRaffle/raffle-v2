import { DataSource } from 'typeorm';
import 'reflect-metadata';

const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'raffle.sqlite3',
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: false,
  entities: [],
});

export { AppDataSource };
