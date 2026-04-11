import { FindOperator } from '@rosen-bridge/extended-typeorm';

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

type SearchFieldQuery<T> = {
  fields: Array<string>;
  fn: (value: T) => FindOperator<T>;
};

type SearchQuery<TMap> = {
  [K in keyof TMap]: Array<SearchFieldQuery<TMap[K]>>;
};

export { RaffleSearchCriteria, SearchQuery, RaffleStatus };
