import {
  DataSource,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from '@rosen-bridge/extended-typeorm';

import { GetWinnerParams, InclusionStatus } from '../types';
import { WinnerView } from '../views';

/**
 * Actions for querying WinnerView database view
 */
export class WinnerViewActions {
  repository: Repository<WinnerView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(WinnerView);
  }

  /**
   * Creates a filter for rewardPercent based on inclusion status
   * @param withShare - Inclusion status to filter by (Empty or NonEmpty)
   * @returns TypeORM where condition object for rewardPercent filtering
   */
  protected withShareFilter = (withShare?: InclusionStatus) => {
    if (withShare !== undefined) {
      return {
        rewardPercent: withShare === InclusionStatus.NonEmpty ? MoreThan(0) : 0,
      };
    }
    return {};
  };

  /**
   * Creates a filter for serialized gift data based on inclusion status
   * @param withGift - Inclusion status to filter by (Empty or NonEmpty)
   * @returns TypeORM where condition object for serialized gift filtering
   */
  protected withGiftFilter = (withGift?: InclusionStatus) => {
    if (withGift !== undefined) {
      return {
        giftSerialized:
          withGift === InclusionStatus.NonEmpty ? Not(IsNull()) : IsNull(),
      };
    }
    return {};
  };

  /**
   * Retrieves winners from the WinnerView with optional filtering and pagination
   * @param params - Query parameters including raffleId, index, share, gift filters, and pagination
   * @returns Promise resolving to tuple of [winner items, total count]
   */
  getWinners = async (params: GetWinnerParams) => {
    return this.repository.findAndCount({
      where: {
        raffleId: params.raffleId,
        index: params.index,
        ...this.withShareFilter(params.share),
        ...this.withGiftFilter(params.gift),
      },
      skip: params.offset ?? 0,
      take: params.limit,
      order: { index: 'ASC' },
    });
  };
}
