import { DataSource } from '@rosen-bridge/extended-typeorm';
import { beforeEach, describe, expect, it } from 'vitest';

import { NewSocialPost, SocialAction } from '../lib';
import { createDatabase } from './utils.mock';

interface TestInterface {
  action: SocialAction;
  dataSource: DataSource;
}

const post = (overrides: Partial<NewSocialPost> = {}): NewSocialPost => ({
  tweetId: '1001',
  raffleId: 'r1',
  authorHandle: 'alice',
  createdAtMs: 1_000,
  fetchedAtMs: 2_000,
  ...overrides,
});

describe('SocialAction', () => {
  beforeEach<TestInterface>(async (ctx) => {
    ctx.dataSource = await createDatabase();
    ctx.action = new SocialAction(ctx.dataSource);
  });

  describe('upsertPosts', () => {
    it<TestInterface>('inserts posts and ignores duplicate tweetIds', async ({
      action,
    }) => {
      await action.upsertPosts([post({ tweetId: '1', createdAtMs: 10 })]);
      // same tweetId again with different data → ignored, no error, no dup
      await action.upsertPosts([post({ tweetId: '1', createdAtMs: 999 })]);

      const items = await action.listByRaffle('r1', 50);
      expect(items).toHaveLength(1);
      expect(items[0].createdAtMs).toBe(10);
    });

    it<TestInterface>('is a no-op on empty input', async ({ action }) => {
      await action.upsertPosts([]);
      expect(await action.listByRaffle('r1', 50)).toHaveLength(0);
    });
  });

  describe('listByRaffle', () => {
    it<TestInterface>('returns only the raffle, newest-first, excluding hidden', async ({
      action,
      dataSource,
    }) => {
      await action.upsertPosts([
        post({ tweetId: '1', raffleId: 'r1', createdAtMs: 100 }),
        post({ tweetId: '2', raffleId: 'r1', createdAtMs: 300 }),
        post({ tweetId: '3', raffleId: 'r1', createdAtMs: 200 }),
        post({ tweetId: '9', raffleId: 'r2', createdAtMs: 999 }),
      ]);
      // hide tweet 2 directly in the DB (manual moderation path)
      await dataSource
        .getRepository('RaffleSocialPostEntity')
        .update({ tweetId: '2' }, { hidden: true });

      const items = await action.listByRaffle('r1', 50);
      expect(items.map((item) => item.tweetId)).toEqual(['3', '1']);
    });

    it<TestInterface>('paginates with beforeMs and limit', async ({
      action,
    }) => {
      await action.upsertPosts([
        post({ tweetId: '1', createdAtMs: 100 }),
        post({ tweetId: '2', createdAtMs: 200 }),
        post({ tweetId: '3', createdAtMs: 300 }),
      ]);
      const firstPage = await action.listByRaffle('r1', 2);
      expect(firstPage.map((item) => item.tweetId)).toEqual(['3', '2']);
      const nextPage = await action.listByRaffle(
        'r1',
        2,
        firstPage[1].createdAtMs,
      );
      expect(nextPage.map((item) => item.tweetId)).toEqual(['1']);
    });
  });

  describe('countByAuthorForRaffle', () => {
    it<TestInterface>('counts non-hidden posts per author (case-insensitive)', async ({
      action,
    }) => {
      await action.upsertPosts([
        post({ tweetId: '1', authorHandle: 'Alice' }),
        post({ tweetId: '2', authorHandle: 'alice' }),
        post({ tweetId: '3', authorHandle: 'bob' }),
      ]);
      const counts = await action.countByAuthorForRaffle('r1');
      expect(counts.get('alice')).toBe(2);
      expect(counts.get('bob')).toBe(1);
    });
  });

  describe('cursor', () => {
    it<TestInterface>('round-trips the high-water-mark per provider', async ({
      action,
    }) => {
      expect(await action.getCursor('thirdparty')).toBeNull();
      await action.setCursor('thirdparty', '12345');
      expect(await action.getCursor('thirdparty')).toBe('12345');
      await action.setCursor('thirdparty', '67890');
      expect(await action.getCursor('thirdparty')).toBe('67890');
      // independent per provider
      expect(await action.getCursor('official')).toBeNull();
    });
  });
});
