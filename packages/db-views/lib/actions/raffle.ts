import {
  DataSource,
  FindOperator,
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  Like,
  Repository,
} from '@rosen-bridge/extended-typeorm';

import { RaffleSearchCriteria } from '../types';
import { orListOptions } from '../utils';
import { RaffleView } from '../views';

const searchMap = {
  text: {
    fields: ['raffleId', 'name', 'description', 'collectingTokenId'],
    fn: (value: string) => Like(value),
  },
  tokenId: { fields: ['tokenId'], fn: (value: Array<string>) => In(value) },
  ids: { fields: ['raffleId'], fn: (value: Array<string>) => In(value) },
};
export class RaffleViewActions {
  repository: Repository<RaffleView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(RaffleView);
  }

  getRaffles = (
    query: RaffleSearchCriteria,
    order: FindOptionsOrder<RaffleView>,
    offset: number = 0,
    limit: number,
  ) => {
    const conditions: { [key: string]: Array<FindOperator<unknown>> } = {};
    (Object.keys(searchMap) as Array<keyof typeof searchMap>).forEach((tag) => {
      if (Object.prototype.hasOwnProperty.call(query, tag)) {
        const value = query[tag] as Parameters<
          (typeof searchMap)[typeof tag]['fn']
        >[0];
        const searchField = searchMap[tag];
        searchField.fields.forEach((field: string) => {
          conditions[field] = conditions[field] ?? [];
          conditions[field].push(
            (searchField.fn as (v: typeof value) => FindOperator<unknown>)(
              value,
            ),
          );
        });
      }
    });
    const where = {} as Record<string, unknown>;
    Object.entries(conditions).forEach(([key, value]) => {
      where[key] = orListOptions(value);
    });
    return this.repository.findAndCount({
      where: where as FindOptionsWhere<RaffleView>,
      order,
      skip: offset,
      take: limit,
    });
  };
}
