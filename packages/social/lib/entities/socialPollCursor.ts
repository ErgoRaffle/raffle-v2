import { Column, Entity, PrimaryColumn } from '@rosen-bridge/extended-typeorm';

/**
 * High-water-mark for incremental mention polling, one row per provider.
 *
 * The poller fetches only mentions newer than `lastSeenTweetId`, so each tick pulls just new
 * posts. Keyed by provider name because the "newest seen" id is meaningful per data source
 * (switching providers should not lose or re-scan history incorrectly).
 */
@Entity('social_poll_cursor')
export class SocialPollCursorEntity {
  /** Provider that produced this cursor: 'official' | 'thirdparty'. */
  @PrimaryColumn({ type: 'varchar' })
  providerName: string;

  /** Largest (newest) tweet id seen so far; null before the first successful poll. */
  @Column({ type: 'varchar', nullable: true })
  lastSeenTweetId: string | null;

  /** Last update time, epoch ms. */
  @Column({ type: 'bigint' })
  updatedAtMs: string;
}
