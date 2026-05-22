import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { DataSource, Like, Repository } from '@rosen-bridge/extended-typeorm';

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
   * @param tags
   */
  upsertTags = async (tags: Array<string>) => {
    this.logger.debug(`Upserting tag ${JSON.stringify(tags)}`);
    const normalized = [...new Set(tags.map((t) => t.toLowerCase()))].filter(
      (t) => t !== '',
    );
    const res = await this.repository.upsert(
      normalized.map((item) => ({ title: item })),
      ['title'],
    );
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
        title: Like(`%${query?.toLowerCase()}%`),
      },
      skip: offset,
      take: limit,
    });
  };
}
