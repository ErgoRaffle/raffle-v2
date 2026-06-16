/**
 * A candidate post about a raffle, normalized to the shape the rest of the system uses.
 * Every provider implementation maps its own response into this so nothing downstream depends
 * on which data source ran.
 *
 * A post qualifies by carrying a raffle URL (`/raffles/{id}` on an allow-listed host) — the URL is
 * the identifier. It may be discovered either because it mentions @ergoraffle or because it links a
 * raffle (the provider query searches both); the mention itself is not required, so it is not part
 * of this shape.
 *
 * Fields in the "transient — filtering only" group exist solely to run the ingest spam filters
 * (see `passesFilters`). They are **never persisted** — the entity stores only id/handle/time.
 */
export interface RawMention {
  /** Tweet id (snowflake string; exceeds JS safe-int range). Primary dedupe key. */
  readonly tweetId: string;
  /** Author handle without the leading '@'. */
  readonly authorHandle: string;
  /** Tweet creation time. */
  readonly createdAt: Date;
  /** Fully-expanded URLs from the tweet's url entities (t.co already unwrapped). */
  readonly urls: readonly string[];

  // ── transient — filtering only (NOT stored) ──
  /** Tweet text — used only for the keyword blocklist check. transient. */
  readonly text: string;
  /** True if this is a pure retweet (dropped by filters). transient. */
  readonly isRetweet: boolean;
  /** Author account creation time — account-age check. transient; undefined if unavailable. */
  readonly authorCreatedAt?: Date;
  /** Author follower count — min-followers check. transient; undefined if unavailable. */
  readonly authorFollowers?: number;
}

/**
 * Fetches new mentions of @ergoraffle. Implemented once per data source (official X API,
 * third-party). The factory picks one at runtime from config.
 */
export interface XMentionsProvider {
  /** Identifies the implementation; also keys the poll cursor. */
  readonly name: 'official' | 'thirdparty';
  /**
   * Return mentions newer than `sinceId` (exclusive). Newest-first is acceptable; the poller
   * sorts/ caps as needed. Pass `null` to fetch the most recent page on a cold start.
   */
  fetchMentions(sinceId: string | null): Promise<RawMention[]>;
}
