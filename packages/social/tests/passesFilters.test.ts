import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SOCIAL_FILTERS,
  passesFilters,
} from '../lib/filters/passesFilters';
import { RawMention } from '../lib/providers/types';

const NOW = new Date('2026-06-16T00:00:00Z');
const oldEnough = new Date('2020-01-01T00:00:00Z'); // > 30 days before NOW

/** Build a mention that passes every rule, overriding fields per test. */
const mention = (overrides: Partial<RawMention> = {}): RawMention => ({
  tweetId: '1',
  authorHandle: 'alice',
  createdAt: NOW,
  urls: ['https://www.ergoraffle.com/raffles/r1'],
  text: 'Check out this raffle!',
  isRetweet: false,
  authorCreatedAt: oldEnough,
  authorFollowers: 100,
  ...overrides,
});

describe('passesFilters', () => {
  it('accepts a clean mention', () => {
    expect(
      passesFilters(mention(), 'r1', new Map(), DEFAULT_SOCIAL_FILTERS, NOW),
    ).toBe(true);
  });

  it('drops retweets', () => {
    expect(
      passesFilters(
        mention({ isRetweet: true }),
        'r1',
        new Map(),
        DEFAULT_SOCIAL_FILTERS,
        NOW,
      ),
    ).toBe(false);
  });

  it('drops blocklisted keywords (case-insensitive)', () => {
    expect(
      passesFilters(
        mention({ text: 'Free AIRDROP, claim now!' }),
        'r1',
        new Map(),
        DEFAULT_SOCIAL_FILTERS,
        NOW,
      ),
    ).toBe(false);
  });

  it('drops too-young accounts', () => {
    expect(
      passesFilters(
        mention({ authorCreatedAt: new Date('2026-06-10T00:00:00Z') }),
        'r1',
        new Map(),
        DEFAULT_SOCIAL_FILTERS,
        NOW,
      ),
    ).toBe(false);
  });

  it('drops low-follower accounts', () => {
    expect(
      passesFilters(
        mention({ authorFollowers: 1 }),
        'r1',
        new Map(),
        DEFAULT_SOCIAL_FILTERS,
        NOW,
      ),
    ).toBe(false);
  });

  it('skips age/follower rules when the provider omits those fields', () => {
    expect(
      passesFilters(
        mention({ authorCreatedAt: undefined, authorFollowers: undefined }),
        'r1',
        new Map(),
        DEFAULT_SOCIAL_FILTERS,
        NOW,
      ),
    ).toBe(true);
  });

  it('enforces the per-author flood cap across a tick', () => {
    const counts = new Map<string, number>();
    const cfg = { ...DEFAULT_SOCIAL_FILTERS, maxPerAuthorPerRaffle: 2 };
    expect(passesFilters(mention(), 'r1', counts, cfg, NOW)).toBe(true);
    expect(passesFilters(mention(), 'r1', counts, cfg, NOW)).toBe(true);
    expect(passesFilters(mention(), 'r1', counts, cfg, NOW)).toBe(false);
    // a different raffle has its own budget for the same author
    expect(passesFilters(mention(), 'r2', counts, cfg, NOW)).toBe(true);
  });
});
