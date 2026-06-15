import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
} from '@rosen-bridge/extended-typeorm';

/**
 * A single X.com post about a raffle.
 *
 * A row exists only for posts the poller accepted: they tag @ergoraffle and link a raffle
 * (the raffle is resolved from the link — see `raffleIdFromUrl`) and pass the spam filters.
 *
 * The tweet **body is intentionally not stored** (X display policy — deletions must be honored);
 * the body is fetched live at render time by the frontend's X embed. We keep only the minimum
 * needed to list and link the post.
 *
 * Timestamps are stored as Unix epoch **milliseconds** in `bigint` columns so ordering is correct
 * and identical across postgres and sqlite (avoids cross-dialect `timestamp` differences). The
 * values fit comfortably in a JS safe integer, so the action layer reads them back as `number`.
 */
@Entity('raffle_social_post')
export class RaffleSocialPostEntity {
  /** Tweet id (snowflake string; exceeds JS safe-int range). Natural primary key → dedupe. */
  @PrimaryColumn({ type: 'varchar' })
  tweetId: string;

  /** Canonical raffle id this post is about. Indexed for the list-by-raffle read path. */
  @Index()
  @Column({ type: 'varchar' })
  raffleId: string;

  /** Author handle without the leading '@', e.g. "satoshi". */
  @Column({ type: 'varchar' })
  authorHandle: string;

  /** Tweet creation time, epoch ms. Used for feed ordering and display. */
  @Column({ type: 'bigint' })
  createdAtMs: string;

  /** When the poller first stored this row, epoch ms. */
  @Column({ type: 'bigint' })
  fetchedAtMs: string;

  /**
   * Moderation flag. Hidden rows are never returned by the public API.
   * Set **manually in the DB** for the rare spam post that slips past the ingest filters;
   * there is no moderation endpoint by design.
   */
  @Column({ type: 'boolean', default: false })
  hidden: boolean;
}
