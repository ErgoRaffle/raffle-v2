import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  DataSource,
  In,
  Raw,
  Repository,
} from '@rosen-bridge/extended-typeorm';

import { ErgoNodeNetwork } from '@ergo-raffle/utils';

import { TokenEntity } from './tokenEntity';

export class TokenAction {
  protected repository: Repository<TokenEntity>;
  private ergoNodeNetwork: ErgoNodeNetwork;

  /**
   * @param dataSource - TypeORM data source
   * @param nodeUrl - Ergo node base URL used to load token metadata
   * @param logger - Logger instance (optional)
   */
  constructor(
    dataSource: DataSource,
    nodeUrl: string,
    logger?: AbstractLogger,
  ) {
    this.repository = dataSource.getRepository(TokenEntity);
    this.ergoNodeNetwork = new ErgoNodeNetwork(
      nodeUrl,
      logger ?? new DummyLogger(),
    );
  }

  /**
   * Loads metadata from the node for each token id and inserts them in a single query.
   * @param tokenIds - Ergo token ids (base16-encoded)
   * @param isVerified - Whether these tokens are marked verified in our system
   */
  insertTokens = async (tokenIds: string[], isVerified: boolean) => {
    const entities: TokenEntity[] = [];
    for (const tokenId of tokenIds) {
      const indexed = await this.ergoNodeNetwork.getTokenData(tokenId);
      entities.push({
        id: indexed.id,
        name: indexed.name,
        decimals: indexed.decimals,
        isVerified,
      });
    }
    await this.repository.insert(entities);
  };

  /**
   * Batch-inserts tokens that do not already exist in the database.
   * Uses a single SELECT to find existing ids, then inserts only the missing ones.
   * @param tokenIds - Ergo token ids (base16-encoded)
   * @param isVerified - Whether these tokens are marked verified
   */
  ensureTokens = async (
    tokenIds: string[],
    isVerified: boolean,
  ): Promise<void> => {
    if (tokenIds.length === 0) return;

    const unique = [...new Set(tokenIds)];
    const existing = await this.repository.find({
      where: { id: In(unique) },
      select: ['id'],
    });
    const existingIds = new Set(existing.map((t) => t.id));
    const missingIds = unique.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      await this.insertTokens(missingIds, isVerified);
    }
  };

  /**
   * Synchronizes the verified status of all stored tokens with the provided list.
   * Tokens in the list are inserted (if missing) or marked verified.
   * Previously verified tokens absent from the list are marked unverified.
   * @param verifiedTokenIds - Token ids that should be verified
   */
  syncVerifiedTokens = async (verifiedTokenIds: string[]): Promise<void> => {
    // Query 1: batch update isVerified for all existing tokens to false
    await this.repository.update({ isVerified: true }, { isVerified: false });
    if (verifiedTokenIds.length === 0) return;

    // Query 2: find which verified token ids already exist
    const existing = await this.repository.find({
      where: { id: In(verifiedTokenIds) },
    });
    const existingIds = new Set(existing.map((t) => t.id));
    const missingIds = verifiedTokenIds.filter((id) => !existingIds.has(id));

    // Query 3: batch insert missing tokens
    if (missingIds.length > 0) {
      await this.insertTokens(missingIds, true);
    }

    // Query 4: batch update isVerified for all existing tokens in one statement
    if (existingIds.size > 0) {
      await this.repository.update(
        { id: In(Array.from(existingIds)) },
        { isVerified: true },
      );
    }
  };

  /**
   * Retrieves tokens from the database by their IDs
   * @param tokenIds - Array of token IDs to retrieve
   * @returns Promise resolving to array of TokenEntity objects
   */
  getTokens = async (tokenIds: Array<string>) => {
    return this.repository.find({
      where: { id: In(tokenIds) },
    });
  };

  /**
   * Searches for tokens by name or ID using a partial match query
   * @param query - Search string to match against token name or ID
   * @param offset - Number of results to skip for pagination
   * @param limit - Maximum number of results to return
   * @returns Promise resolving to tuple of [token items, total count]
   */
  searchTokens = async (query: string, offset: number, limit: number) => {
    return this.repository.findAndCount({
      where: [
        {
          name: Raw(
            (alias) => `LOWER(${alias}) LIKE '%${query.toLowerCase()}%'`,
          ),
        },
        {
          id: Raw((alias) => `LOWER(${alias}) LIKE '%${query.toLowerCase()}%'`),
        },
      ],
      take: limit,
      skip: offset,
    });
  };
}
