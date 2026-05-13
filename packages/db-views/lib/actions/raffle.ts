import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

import { ERG_TOKEN_ID } from '@ergo-raffle/utils';

import { getRaffleParams, RaffleStatus, RaffleWithTotalResult } from '../types';
import { RaffleView } from '../views';

export class RaffleViewActions {
  repository: Repository<RaffleView>;

  constructor(protected dataSource: DataSource) {
    this.repository = dataSource.getRepository(RaffleView);
  }

  /**
   * Creates a SQL LIKE condition for searching text across raffleId, name, description, collectingTokenId fields
   * @param text - Search text to match (case-insensitive)
   * @returns SQL condition and parameters, or undefined if no text provided
   */
  protected createTextSearch = (text?: string) => {
    if (text) {
      const fields = [
        'raffleId',
        'name',
        'description',
        'collectingTokenId',
        'tags',
      ];
      const condition = fields
        .map((field) => `LOWER("${field}") LIKE :text`)
        .join(' OR ');
      return { condition, params: { text: `%${text.toLowerCase()}%` } };
    }
  };

  /**
   * Creates an IN clause condition for filtering by a list of values
   * @param field - Database field name to filter on
   * @param collection - Parameter name for the collection
   * @param items - Array of values to match
   * @returns SQL condition and parameters, or undefined if items array is empty
   */
  protected createInListSearch = (
    field: string,
    collection: string,
    items: Array<string>,
  ) => {
    if (items.length) {
      return {
        condition: `"${field}" IN (:...${collection})`,
        params: { [collection]: items },
      };
    }
  };

  /**
   * Builds a tokenId filter condition for the raffle query.
   *
   * Raffles that collect ERG are stored with `collectingTokenId = NULL` (not
   * the literal `ERG_TOKEN_ID`), so when `ERG_TOKEN_ID` is included we emit an
   * `IS NULL` clause. Any other token ids are emitted as an `IN (:...tokenIds)`
   * clause and combined with the ERG clause using `OR`.
   *
   * @param tokenIds - Collecting token ids to filter by (may include `ERG_TOKEN_ID`)
   * @returns Query fragment with `{ condition, params }` suitable for QueryBuilder,
   * or `undefined` when `tokenIds` is empty / yields no conditions
   */
  protected createTokenIdQuery = (tokenIds: Array<string>) => {
    const queries: Array<string> = [];
    if (tokenIds.includes(ERG_TOKEN_ID)) {
      queries.push('"collectingTokenId" IS NULL');
    }
    const inList = this.createInListSearch(
      'collectingTokenId',
      'tokenIds',
      tokenIds.filter((item) => item !== ERG_TOKEN_ID),
    );
    if (inList) {
      queries.push(inList.condition);
    }
    if (queries.length > 0) {
      return {
        params: inList?.params ?? {},
        condition: queries.join(' OR '),
      };
    }
  };

  /**
   * Creates a simple numeric comparison SQL fragment of the form `"<field>" <operator> 0`.
   *
   * This is used for status filtering where derived counter fields (e.g. `successCount`,
   * `redeemCount`) are compared against zero.
   *
   * @param field - View column name to compare. Must be a trusted/known field name.
   * @param operator - SQL comparison operator (e.g. `=` or `>`). Must be a trusted constant.
   * @returns SQL fragment string (no parameters), e.g. `"successCount" > 0`
   */
  protected createFieldQuery = (field: string, operator: string) =>
    `"${field}" ${operator} 0`;

  /**
   * Creates SQL conditions for filtering by raffle status
   * Uses XOR logic: Active requires successCount=0 AND redeemCount=0
   * @param status - Array of raffle statuses to filter by
   * @returns Array of SQL condition strings
   */
  protected createStatusSearch = (status: Array<RaffleStatus>) => {
    const isActive = status.includes(RaffleStatus.Active);
    const isSuccess = status.includes(RaffleStatus.SuccessFull);
    const isFailed = status.includes(RaffleStatus.Failed);
    const activeQuery = [
      this.createFieldQuery('successCount', '='),
      this.createFieldQuery('redeemCount', '='),
    ].join(' AND ');
    const failedQuery = this.createFieldQuery('redeemCount', '>');
    const successQuery = this.createFieldQuery('successCount', '>');
    const condition = [
      isActive ? `(${activeQuery})` : '',
      isFailed ? failedQuery : '',
      isSuccess ? successQuery : '',
    ]
      .filter((item) => item !== '')
      .join(' OR ');
    return condition === '' ? undefined : { condition, params: {} };
  };

  /**
   * Creates SQL LIKE conditions for searching by tags.
   * Tags are stored as comma-separated values, so each tag is wrapped in commas for exact matching
   * @param tags - Array of tag strings to search for
   * @returns SQL condition and parameters, or undefined if tags array is empty
   */
  protected createTagsSearch = (tags: Array<string>) => {
    if (tags.length > 0) {
      const queries = tags.map((_, index) => `"tags" LIKE :tag${index}`);
      const params = tags
        .map((item, index) => ({ [`tag${index}`]: `%,${item},%` }))
        .reduce((a, b) => ({ ...a, ...b }), {});
      return { condition: queries.join(' OR '), params };
    }
  };

  /**
   * Retrieves raffles from the database with optional filtering, ordering, and pagination
   * @param params - Query parameters including filters, order, offset, and limit
   * @returns Tuple containing array of raffle views and total count
   */
  getRaffles = async (
    params: getRaffleParams,
  ): Promise<RaffleWithTotalResult> => {
    const queryBuilder = this.repository.createQueryBuilder();
    const queries = [
      this.createTextSearch(params.query?.text),
      this.createStatusSearch(params.query?.status ?? []),
      this.createTokenIdQuery(params.query?.tokenIds ?? []),
      this.createInListSearch('raffleId', 'ids', params.query?.ids ?? []),
      this.createTagsSearch(params.query?.tags ?? []),
    ].filter(Boolean) as Array<{
      condition: string;
      params: Record<string, unknown>;
    }>;
    for (let index = 0; index < queries.length; index++) {
      if (index === 0) {
        queryBuilder.where(
          `(${queries[index].condition})`,
          queries[index].params,
        );
      } else {
        queryBuilder.andWhere(
          `(${queries[index].condition})`,
          queries[index].params,
        );
      }
    }
    if (params.order) {
      queryBuilder.orderBy(params.order.field, params.order.direction);
    }
    queryBuilder.skip(params.offset ?? 0).take(params.limit);

    const [items, total] = await queryBuilder.getManyAndCount();
    const fetchedRaffles = items.map(this.transformRaffleView);
    return { items: fetchedRaffles, total };
  };

  /**
   * Retrieves a single raffle by its ID
   * @param raffleId - The raffle ID to search for
   * @returns RaffleView instance or null if not found
   */
  getRaffle = async (raffleId: string): Promise<RaffleView | null> => {
    const item = await this.repository.findOne({ where: { raffleId } });
    return item === null ? item : this.transformRaffleView(item);
  };

  /**
   * Transforms a RaffleView item by converting field types to match expected output
   * These conversions are needed because queryBuilder missed executing transform on fields
   * and COUNT output type is mismatched between postgres and sqlite
   * @param item - RaffleView item to transform
   * @returns Transformed RaffleView with correct field types
   */
  protected transformRaffleView = (item: RaffleView): RaffleView => ({
    ...item,
    // these conversions are needed because queryBuilder missed executing transform on field also COUNT output type mismatched in postgres and sqlite
    successCount: Number(item.successCount),
    redeemCount: Number(item.redeemCount),
    giftCount: Number(item.giftCount),
    soldTicketCount: BigInt(item.soldTicketCount ?? 0),
    ticketPrice: BigInt(item.ticketPrice),
    goal: BigInt(item.goal),
    txFee: BigInt(item.txFee),
    backerCount: Number(item.backerCount),
  });
}
