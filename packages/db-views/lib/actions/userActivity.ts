import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

import { getUserActivityParams, UserActivityWithTotalResult } from '../types';
import { UserActivityView } from '../views';

export class UserActivityViewActions {
  repository: Repository<UserActivityView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(UserActivityView);
  }

  /**
   * Retrieves user activities from the database with optional filtering by ergoTree or raffleId, and pagination.
   * @param params - Query parameters including optional ergoTree/raffleId filters, offset, and limit.
   * @returns Object containing array of user activity views and total count.
   */
  getActivities = async (
    params: getUserActivityParams,
  ): Promise<UserActivityWithTotalResult> => {
    const queryBuilder = this.repository.createQueryBuilder();

    if (params.query?.ergoTree) {
      queryBuilder.where('"ergoTree" = :ergoTree', {
        ergoTree: params.query.ergoTree,
      });
    }

    if (params.query?.raffleId) {
      const method = params.query?.ergoTree ? 'andWhere' : 'where';
      queryBuilder[method]('"raffleId" = :raffleId', {
        raffleId: params.query.raffleId,
      });
    }

    queryBuilder.skip(params.offset ?? 0).take(params.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const activities = items.map(
      (item) =>
        ({
          ...item,
          ticketCount:
            item.ticketCount != null ? BigInt(item.ticketCount) : undefined,
        }) as UserActivityView,
    );

    return { items: activities, total };
  };
}
