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
    const [items, total] = await this.repository.findAndCount({
      where: {
        ergoTree: params.query?.ergoTree,
        raffleId: params.query?.raffleId,
      },
      skip: params.offset ?? 0,
      take: params.limit,
      order: { height: 'ASC' },
    });

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
