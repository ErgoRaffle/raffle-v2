import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { DataSource, Raw, Repository } from '@rosen-bridge/extended-typeorm';

import { TagEntity } from '../entities';

export class TagAction {
  protected repository: Repository<TagEntity>;

  /**
   * @param dataSource - TypeORM data source
   * @param logger - Logger instance (optional)
   */
  constructor(
    dataSource: DataSource,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {
    this.repository = dataSource.getRepository(TagEntity);
  }

  /**
   * Inserts a tag or updates it when a row with the same title already exists.
   * @param tag - Tag title to store
   */
  upsertTag = async (tag: string) => {
    this.logger.debug(`Upserting tag ${tag}`);
    const res = await this.repository.upsert({ title: tag }, ['title']);
    this.logger.trace(`Upserted tag ${res}`);
  };

  /**
   * Searches tags by title using a case-insensitive partial match.
   * @param query - Substring to match against tag titles
   * @param offset - Number of results to skip for pagination
   * @param limit - Maximum number of results to return
   * @returns Matching tag entities
   */
  getTags = async (query?: string, offset = 0, limit = 10) => {
    return await this.repository.find({
      where: {
        title: query
          ? Raw((alias) => `LOWER(${alias}) LIKE '%${query.toLowerCase()}%'`)
          : undefined,
      },
      skip: offset,
      take: limit,
    });
  };
}
