import { DataSource } from 'typeorm';

import { migrations as scannerMigrations } from '@rosen-bridge/scanner';

import { migrations } from '../lib/migrations';
import { RaffleService } from '../lib/entities/raffleService';

/**
 * generate dataSource and related database
 *  used for test datasource
 * @param name
 */
export const createDatabase = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'sqlite',
    database: `:memory:`,
    entities: [RaffleService],
    migrations: [...migrations.sqlite, ...scannerMigrations.sqlite],
    synchronize: true,
    logging: false,
  });
  await dataSource.initialize();
  await dataSource.runMigrations();
  return dataSource;
};

/**
 * cleaning all table of the passed datasource
 * @param dataSource
 */
export async function clearDB(dataSource: DataSource) {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repository = await dataSource.getRepository(entity.name);
    await repository.query(`DELETE FROM ${entity.tableName};`);
    await repository.query(
      `DELETE FROM SQLITE_SEQUENCE WHERE name='${entity.tableName}';`,
    );
  }
}
