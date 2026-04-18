import {
  DataSource,
  IsNull,
  MoreThan,
  Not,
  Repository,
} from '@rosen-bridge/extended-typeorm';

import { GetWinnerParams, InclusionStatus } from '../types';
import { WinnerView } from '../views';

export class WinnerViewActions {
  repository: Repository<WinnerView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(WinnerView);
  }

  protected withShareFilter = (withShare?: InclusionStatus) => {
    if (withShare !== undefined) {
      return {
        rewardPercent: withShare === InclusionStatus.NonEmpty ? MoreThan(0) : 0,
      };
    }
    return {};
  };

  protected withGiftFilter = (withGift?: InclusionStatus) => {
    if (withGift !== undefined) {
      return {
        serialized:
          withGift === InclusionStatus.NonEmpty ? Not(IsNull()) : IsNull(),
      };
    }
    return {};
  };

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
    });
  };
}
