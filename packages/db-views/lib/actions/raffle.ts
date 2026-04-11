import {
  DataSource,
  FindOptionsOrder,
  FindOptionsWhere,
  In,
  IsNull,
  Like,
  Or,
  Repository,
} from '@rosen-bridge/extended-typeorm';

import { buildWhere } from '@ergo-raffle/query-generator';

import { RaffleSearchCriteria } from '../types';
import { orListOptions } from '../utils';
import { RaffleView } from '../views';

export class RaffleViewActions {
  repository: Repository<RaffleView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(RaffleView);
  }

  getRaffles = (
    query: Partial<RaffleSearchCriteria>,
    order: FindOptionsOrder<RaffleView>,
    offset: number = 0,
    limit: number,
  ) => {
    const where = buildWhere(
      {
        text: query.text,
        tokenId: query.tokenIds,
        ids: query.ids,
        status: query.status,
        tags: query.tags,
      },
      {
        text: {
          fields: ['raffleId', 'name', 'description', 'collectingTokenId'],
          resolver: (value: unknown) => Like(`%${value}%`),
        },
        tokenId: {
          fields: ['collectingTokenId'],
          resolver: (value: unknown) => {
            const valueArr = value as Array<string>;
            if (valueArr.includes('erg')) {
              return Or(IsNull(), In(valueArr));
            }
            return In(value as Array<string>);
          },
        },
        ids: {
          fields: ['raffleId'],
          resolver: (value) => In(value as Array<string>),
        },
        tags: {
          fields: ['tags'],
          resolver: (value) =>
            orListOptions(
              (value as Array<string>).map((item) => Like(`%,${item},%`)),
            ),
        },
      },
    );

    return this.repository.findAndCount({
      where: where as FindOptionsWhere<RaffleView>,
      order,
      skip: offset,
      take: limit,
    });
  };
}
