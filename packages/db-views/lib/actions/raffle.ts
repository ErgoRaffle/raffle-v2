import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

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
   * Creates a condition for XOR logic between Active and another status
   * @param isActive - Whether Active status is included
   * @param isOtherStatus - Whether the other status (Success/Failed) is included
   * @param field - Database field name to check (successCount or redeemCount)
   * @returns SQL condition string, or undefined if both statuses are the same
   */
  protected createXorFieldSearch = (
    isActive: boolean,
    isOtherStatus: boolean,
    field: string,
  ) => {
    if (isActive !== isOtherStatus) {
      const operator = isActive ? '=' : '>';
      return `"${field}" ${operator} 0`;
    }
  };

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
    return [
      // If one and only one of isActive and isSuccess passed "successCount" must be filtered
      this.createXorFieldSearch(isActive, isSuccess, 'successCount'),
      // If one and only one of isActive and isFailed passed "redeemCount" must be filtered
      this.createXorFieldSearch(isActive, isFailed, 'redeemCount'),
    ].filter(Boolean) as Array<string>;
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
      ...this.createStatusSearch(params.query?.status ?? []).map(
        (condition) => ({ condition, params: {} }),
      ),
      this.createInListSearch(
        'collectingTokenId',
        'tokenIds',
        params.query?.tokenIds ?? [],
      ),
      this.createInListSearch('raffleId', 'ids', params.query?.ids ?? []),
      this.createTagsSearch(params.query?.tags ?? []),
    ].filter(Boolean) as Array<{
      condition: string;
      params: Record<string, unknown>;
    }>;
    for (let index = 0; index < queries.length; index++) {
      if (index === 0) {
        queryBuilder.where(queries[index].condition, queries[index].params);
      } else {
        queryBuilder.andWhere(queries[index].condition, queries[index].params);
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
    soldTicketCount: BigInt(item.soldTicketCount),
    ticketPrice: BigInt(item.ticketPrice),
    goal: BigInt(item.goal),
    txFee: BigInt(item.txFee),
    bakers: Number(item.bakers),
  });
}
