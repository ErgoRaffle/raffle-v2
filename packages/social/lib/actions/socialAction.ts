import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

import { RaffleSocialPostEntity } from '../entities/raffleSocialPost';
import { SocialPollCursorEntity } from '../entities/socialPollCursor';

/**
 * A stored social post in the clean, typed shape the rest of the app consumes
 * (epoch-ms `bigint` columns converted back to `number`).
 */
export interface SocialPostRecord {
  tweetId: string;
  raffleId: string;
  authorHandle: string;
  createdAtMs: number;
}

/** Input for inserting a post (timestamps as epoch ms). */
export interface NewSocialPost {
  tweetId: string;
  raffleId: string;
  authorHandle: string;
  createdAtMs: number;
  fetchedAtMs: number;
}

/**
 * Read/write access to the social-post store and the poll cursor.
 *
 * Mirrors the repo's action pattern (e.g. `TagAction`, `RaffleViewActions`): a thin class over
 * TypeORM repositories, used by the background-job poller (writes + cursor) and the API (reads).
 */
export class SocialAction {
  protected postRepository: Repository<RaffleSocialPostEntity>;
  protected cursorRepository: Repository<SocialPollCursorEntity>;

  constructor(protected dataSource: DataSource) {
    this.postRepository = dataSource.getRepository(RaffleSocialPostEntity);
    this.cursorRepository = dataSource.getRepository(SocialPollCursorEntity);
  }

  /**
   * Insert posts, ignoring any whose `tweetId` already exists (idempotent across polls).
   * Uses `INSERT ... ON CONFLICT DO NOTHING` semantics, supported on both postgres and sqlite.
   * @param posts - posts to insert; empty input is a no-op
   */
  upsertPosts = async (posts: NewSocialPost[]): Promise<void> => {
    if (posts.length === 0) return;
    await this.postRepository
      .createQueryBuilder()
      .insert()
      .into(RaffleSocialPostEntity)
      .values(
        posts.map((post) => ({
          tweetId: post.tweetId,
          raffleId: post.raffleId,
          authorHandle: post.authorHandle,
          createdAtMs: post.createdAtMs.toString(),
          fetchedAtMs: post.fetchedAtMs.toString(),
          hidden: false,
        })),
      )
      .orIgnore()
      .execute();
  };

  /**
   * List non-hidden posts for a raffle, newest first, with offset/limit pagination
   * (matches the house API style: returns the page plus the total count).
   * @param raffleId - raffle to list posts for
   * @param offset - rows to skip
   * @param limit - max rows to return
   * @returns the page of posts (newest first) and the total non-hidden count for the raffle
   */
  listByRaffle = async (
    raffleId: string,
    offset: number,
    limit: number,
  ): Promise<{ items: SocialPostRecord[]; total: number }> => {
    const [items, total] = await this.postRepository
      .createQueryBuilder('post')
      .where('post.raffleId = :raffleId', { raffleId })
      .andWhere('post.hidden = :hidden', { hidden: false })
      .orderBy('post.createdAtMs', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();
    return { items: items.map(this.transformPost), total };
  };

  /**
   * Count existing stored (non-hidden) posts per author for a raffle, to seed the poller's
   * per-author flood cap across ticks.
   * @param raffleId - raffle to count for
   * @returns map of lower-cased author handle → stored post count
   */
  countByAuthorForRaffle = async (
    raffleId: string,
  ): Promise<Map<string, number>> => {
    const rows = await this.postRepository
      .createQueryBuilder('post')
      .select('LOWER(post.authorHandle)', 'handle')
      .addSelect('COUNT(*)', 'count')
      .where('post.raffleId = :raffleId', { raffleId })
      .andWhere('post.hidden = :hidden', { hidden: false })
      .groupBy('LOWER(post.authorHandle)')
      .getRawMany<{ handle: string; count: string }>();
    return new Map(rows.map((row) => [row.handle, Number(row.count)]));
  };

  /**
   * Read the poll high-water-mark for a provider.
   * @param providerName - 'official' | 'thirdparty'
   * @returns the last seen tweet id, or null if never polled
   */
  getCursor = async (providerName: string): Promise<string | null> => {
    const row = await this.cursorRepository.findOne({
      where: { providerName },
    });
    return row?.lastSeenTweetId ?? null;
  };

  /**
   * Persist the poll high-water-mark for a provider.
   * @param providerName - 'official' | 'thirdparty'
   * @param lastSeenTweetId - newest tweet id processed this tick
   */
  setCursor = async (
    providerName: string,
    lastSeenTweetId: string,
  ): Promise<void> => {
    await this.cursorRepository.save({
      providerName,
      lastSeenTweetId,
      updatedAtMs: Date.now().toString(),
    });
  };

  /**
   * Convert a stored entity (bigint columns come back as strings) into the clean typed record.
   * Epoch-ms values are within JS safe-integer range, so Number() is lossless here.
   */
  protected transformPost = (
    item: RaffleSocialPostEntity,
  ): SocialPostRecord => ({
    tweetId: item.tweetId,
    raffleId: item.raffleId,
    authorHandle: item.authorHandle,
    createdAtMs: Number(item.createdAtMs),
  });
}
