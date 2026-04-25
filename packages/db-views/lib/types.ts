import { RaffleView } from './views';

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

type RaffleWithTotalResult = {
  items: Array<RaffleView>;
  total: number;
};

export {
  RaffleStatus,
  getRaffleParams,
  RaffleOrder,
  RaffleWithTotalResult,
  GetWinnerParams,
  InclusionStatus,
};
