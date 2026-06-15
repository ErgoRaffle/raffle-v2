import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  OfficialMentionsProvider,
  ThirdPartyMentionsProvider,
  makeMentionsProvider,
  type ProviderConfig,
} from '../lib';

/** Stub global fetch to return a single JSON body, ok:true. */
const stubFetchOnce = (body: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => body,
    })),
  );
};

// Two providers' raw responses describing the SAME logical tweet.
const OFFICIAL_BODY = {
  data: [
    {
      id: '555',
      text: 'Backing this raffle!',
      author_id: 'u1',
      created_at: '2026-06-01T12:00:00.000Z',
      entities: {
        urls: [{ expanded_url: 'https://www.ergoraffle.com/raffles/abc' }],
        mentions: [{ username: 'ergoraffle' }],
      },
    },
  ],
  includes: {
    users: [
      {
        id: 'u1',
        username: 'alice',
        created_at: '2020-01-01T00:00:00.000Z',
        public_metrics: { followers_count: 100 },
      },
    ],
  },
  meta: {},
};

const THIRDPARTY_BODY = {
  tweets: [
    {
      id: '555',
      text: 'Backing this raffle!',
      createdAt: '2026-06-01T12:00:00.000Z',
      entities: {
        urls: [{ expanded_url: 'https://www.ergoraffle.com/raffles/abc' }],
      },
      author: {
        userName: 'alice',
        createdAt: '2020-01-01T00:00:00.000Z',
        followers: 100,
      },
    },
  ],
  has_next_page: false,
};

describe('mentions providers', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('both providers normalize equivalent input to the same RawMention', async () => {
    stubFetchOnce(OFFICIAL_BODY);
    const official = await new OfficialMentionsProvider({
      bearerToken: 'x',
      userId: '1',
      handle: 'ergoraffle',
      baseUrl: 'https://example.test',
    }).fetchMentions(null);

    stubFetchOnce(THIRDPARTY_BODY);
    const thirdparty = await new ThirdPartyMentionsProvider({
      apiKey: 'x',
      handle: 'ergoraffle',
      baseUrl: 'https://example.test',
    }).fetchMentions(null);

    const expected = {
      tweetId: '555',
      authorHandle: 'alice',
      createdAt: new Date('2026-06-01T12:00:00.000Z'),
      urls: ['https://www.ergoraffle.com/raffles/abc'],
      mentionsErgoraffle: true,
      text: 'Backing this raffle!',
      isRetweet: false,
      authorCreatedAt: new Date('2020-01-01T00:00:00.000Z'),
      authorFollowers: 100,
    };
    expect(official).toEqual([expected]);
    expect(thirdparty).toEqual([expected]);
  });

  it('factory selects the configured provider', () => {
    const config: ProviderConfig = {
      provider: 'thirdparty',
      official: { bearerToken: 'x', userId: '1', handle: 'ergoraffle' },
      thirdparty: { apiKey: 'x', handle: 'ergoraffle' },
    };
    expect(makeMentionsProvider(config).name).toBe('thirdparty');
    expect(makeMentionsProvider({ ...config, provider: 'official' }).name).toBe(
      'official',
    );
  });
});
