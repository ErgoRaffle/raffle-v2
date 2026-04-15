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

export { RaffleStatus, getRaffleParams, RaffleOrder, RaffleWithTotalResult };
