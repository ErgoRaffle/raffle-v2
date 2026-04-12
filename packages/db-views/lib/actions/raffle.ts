import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

import { getRaffleParams, RaffleStatus } from '../types';
import { RaffleView } from '../views';

export class RaffleViewActions {
  repository: Repository<RaffleView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(RaffleView);
  }

  protected createTextSearch = (text?: string) => {
    if (text) {
      const fields = ['raffleId', 'name', 'description', 'collectingTokenId'];
      const condition = fields
        .map((field) => `${field} LIKE :text`)
        .join(' OR ');
      return { condition, params: { text: `%${text}%` } };
    }
  };

  protected createInListSearch = (
    field: string,
    collection: string,
    items: Array<string>,
  ) => {
    if (items.length) {
      return {
        condition: `${field} IN (:...${collection})`,
        params: { [collection]: items },
      };
    }
  };

  protected createXorFieldSearch = (
    isActive: boolean,
    isOtherStatus: boolean,
    field: string,
  ) => {
    if (isActive !== isOtherStatus) {
      const operator = isActive ? '=' : '>';
      return `${field} ${operator} 0`;
    }
  };

  protected createStatusSearch = (status: Array<RaffleStatus>) => {
    const isActive = status.includes(RaffleStatus.Active);
    const isSuccess = status.includes(RaffleStatus.SuccessFull);
    const isFailed = status.includes(RaffleStatus.Failed);
    return [
      this.createXorFieldSearch(isActive, isSuccess, 'successCount'),
      this.createXorFieldSearch(isActive, isFailed, 'redeemCount'),
    ].filter(Boolean) as Array<string>;
  };

  getRaffles = (params: getRaffleParams) => {
    const queryBuilder = this.repository.createQueryBuilder();
    const queries = [
      this.createTextSearch(params.query?.text),
      ...this.createStatusSearch(params.query?.status ?? []).map(
        (condition) => ({ condition, params: {} }),
      ),
      this.createInListSearch(
        'collectingTokenId',
        'tokenIds',
        params.query?.tokenIds ?? [],
      ),
      this.createInListSearch('raffleId', 'ids', params.query?.ids ?? []),
    ].filter(Boolean) as Array<{
      condition: string;
      params: Record<string, unknown>;
    }>;
    for (let index = 0; index < queries.length; index++) {
      if (index === 0) {
        queryBuilder.where(queries[index].condition, queries[index].params);
      } else {
        queryBuilder.andWhere(queries[index].condition, queries[index].params);
      }
    }
    if (params.order) {
      queryBuilder.orderBy(params.order.field, params.order.direction);
    }
    queryBuilder.skip(params.offset ?? 0).take(params.limit);

    return queryBuilder.getManyAndCount();
  };
}
