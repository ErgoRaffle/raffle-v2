import { DataSource, In, Repository } from '@rosen-bridge/extended-typeorm';

import { getUserActivityParams, ActivityWithTotalResult } from '../types';
import { ActivityWithTimeView } from '../views';

export class ActivityViewActions {
  repository: Repository<ActivityWithTimeView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(ActivityWithTimeView);
  }

  /**
   * Retrieves user activities from the database with optional filtering by ergoTree or raffleId, and pagination.
   * @param params - Query parameters including optional ergoTree/raffleId filters, offset, and limit.
   * @returns Object containing array of user activity views and total count.
   */
  getActivities = async (
    params: getUserActivityParams,
  ): Promise<ActivityWithTotalResult> => {
    const [items, total] = await this.repository.findAndCount({
      where: {
        ergoTree: params.query?.ergoTree,
        raffleId: params.query?.raffleId,
        type:
          params.types && params.types.length > 0
            ? In(params.types)
            : undefined,
      },
      skip: params.offset ?? 0,
      take: params.limit,
      order: { height: 'DESC' },
    });

    const activities = items.map(
      (item) =>
        ({
          ...item,
          ticketCount:
            item.ticketCount != null ? BigInt(item.ticketCount) : undefined,
        }) as ActivityWithTimeView,
    );

    return { items: activities, total };
  };
}
