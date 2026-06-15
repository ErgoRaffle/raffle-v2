import { RawMention } from '../providers/types';

/**
 * Tunable spam-filter thresholds. Sourced from service config so they can be adjusted without
 * a code change. See the per-rule notes in `passesFilters`.
 */
export interface SocialFilterConfig {
  /** Lower-cased substrings; a tweet whose text contains any is dropped. */
  readonly keywords: readonly string[];
  /** Minimum author account age, in days. Blocks throwaway accounts. */
  readonly minAccountAgeDays: number;
  /** Minimum author follower count. A soft bot signal — keep low. */
  readonly minFollowers: number;
  /** Max posts from one author on one raffle (existing stored rows + this tick). */
  readonly maxPerAuthorPerRaffle: number;
}

/**
 * Default spam-filter config. Conservative, tunable via service config. The keyword list is a
 * seed of common crypto-scam phrasing, not an exhaustive blocklist.
 */
export const DEFAULT_SOCIAL_FILTERS: SocialFilterConfig = {
  keywords: [
    'airdrop',
    'free crypto',
    'giveaway',
    'double your',
    'claim now',
    'dm me',
    'seed phrase',
    'wallet validation',
    'connect your wallet',
    't.me/',
    'metamask',
    'elon',
  ],
  minAccountAgeDays: 30,
  minFollowers: 5,
  maxPerAuthorPerRaffle: 3,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Decide whether a mention is allowed into a raffle's feed. Runs at ingest, on the transient
 * `RawMention` fields. A mention must pass **every** rule.
 *
 * Unknown-field policy: if a provider omits `authorCreatedAt` / `authorFollowers`, the rule that
 * needs it is **skipped** for that mention (treated as "unknown, not a failure") rather than
 * dropping a possibly-legit post. `text` and `isRetweet` are always present.
 *
 * The per-author flood cap is enforced via a caller-supplied counter that spans the whole tick
 * (and should be seeded with existing stored counts), so one author cannot flood a raffle.
 *
 * @param mention - the normalized mention
 * @param raffleId - the raffle this mention resolved to (for the per-author cap key)
 * @param authorCounts - mutable counter keyed `${raffleId}:${authorHandle}`, updated on accept
 * @param config - filter thresholds
 * @param now - current time (injectable for tests)
 * @returns true if the mention should be stored and shown
 */
export const passesFilters = (
  mention: RawMention,
  raffleId: string,
  authorCounts: Map<string, number>,
  config: SocialFilterConfig,
  now: Date = new Date(),
): boolean => {
  // 1. No retweets — only original or quote posts.
  if (mention.isRetweet) return false;

  // 2. Keyword blocklist — case-insensitive substring match on the tweet text.
  const text = mention.text.toLowerCase();
  if (config.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return false;
  }

  // 3. Minimum account age (skipped when the provider didn't supply the creation date).
  if (mention.authorCreatedAt) {
    const ageDays =
      (now.getTime() - mention.authorCreatedAt.getTime()) / MS_PER_DAY;
    if (ageDays < config.minAccountAgeDays) return false;
  }

  // 4. Minimum followers (skipped when the provider didn't supply the count).
  if (mention.authorFollowers !== undefined) {
    if (mention.authorFollowers < config.minFollowers) return false;
  }

  // 5. Per-author flood cap for this raffle.
  const key = `${raffleId}:${mention.authorHandle.toLowerCase()}`;
  const seen = authorCounts.get(key) ?? 0;
  if (seen >= config.maxPerAuthorPerRaffle) return false;
  authorCounts.set(key, seen + 1);

  return true;
};
