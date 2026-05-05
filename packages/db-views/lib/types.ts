import { RaffleView, UserActivityView } from './views';

const USER_ACTIVITY_TYPES = ['creation', 'donation', 'gift'] as const;
type UserActivityType = (typeof USER_ACTIVITY_TYPES)[number];

type ItemTotal<T> = {
  items: Array<T>;
  total: number;
};

enum RaffleStatus {
  SuccessFull = 'successful',
  Failed = 'failed',
  Active = 'active',
}

type RaffleSearchCriteria = {
  text: string;
  tokenIds: Array<string>;
  tags: Array<string>;
  status: Array<RaffleStatus>;
  ids: Array<string>;
};

type RaffleOrder = {
  field: keyof RaffleView;
  direction: 'ASC' | 'DESC';
};

enum InclusionStatus {
  Empty = 'empty',
  NonEmpty = 'non-empty',
}

type GetWinnerParams = {
  raffleId: string;
  share?: InclusionStatus;
  gift?: InclusionStatus;
  index?: number;
  offset?: number;
  limit: number;
};

type getRaffleParams = {
  query?: Partial<RaffleSearchCriteria>;
  order?: RaffleOrder;
  offset?: number;
  limit: number;
};

type RaffleWithTotalResult = ItemTotal<RaffleView>;

type getUserActivityParams = {
  query?: {
    ergoTree?: string;
    raffleId?: string;
  };
  offset?: number;
  limit: number;
};

type UserActivityWithTotalResult = ItemTotal<UserActivityView>;

export {
  USER_ACTIVITY_TYPES,
  UserActivityType,
  ItemTotal,
  RaffleStatus,
  getRaffleParams,
  RaffleOrder,
  RaffleWithTotalResult,
  getUserActivityParams,
  UserActivityWithTotalResult,
  GetWinnerParams,
  InclusionStatus,
};
