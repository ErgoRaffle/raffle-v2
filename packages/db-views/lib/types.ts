import { RaffleView, ActivityWithTimeView } from './views';

const USER_ACTIVITY_TYPES = [
  'creation',
  'donation',
  'gift',
  'ticket_redeem',
  'gift_return',
] as const;
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

enum ActivityType {
  Creation = 'creation',
  Donation = 'donation',
  Gift = 'gift',
  TicketRedeem = 'ticket_redeem',
  GiftReturn = 'gift_return',
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
  types?: Array<ActivityType>;
  offset?: number;
  limit: number;
};

type ActivityWithTotalResult = ItemTotal<ActivityWithTimeView>;

export {
  USER_ACTIVITY_TYPES,
  UserActivityType,
  ItemTotal,
  RaffleStatus,
  getRaffleParams,
  RaffleOrder,
  RaffleWithTotalResult,
  getUserActivityParams,
  ActivityWithTotalResult,
  GetWinnerParams,
  InclusionStatus,
  ActivityType,
};
