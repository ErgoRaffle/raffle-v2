import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildDiscoveryQuery,
  OfficialMentionsProvider,
  ThirdPartyMentionsProvider,
  makeMentionsProvider,
  type ProviderConfig,
} from '../lib';

/** Stub global fetch to return a single JSON body, ok:true, capturing the requested URLs. */
const stubFetchOnce = (body: unknown): { urls: string[] } => {
  const calls = { urls: [] as string[] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown) => {
      calls.urls.push(String(input));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => body,
      };
    }),
  );
  return calls;
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
      text: 'Backing this raffle!',
      isRetweet: false,
      authorCreatedAt: new Date('2020-01-01T00:00:00.000Z'),
      authorFollowers: 100,
    };
    expect(official).toEqual([expected]);
    expect(thirdparty).toEqual([expected]);
  });

  it('both providers query mention OR raffle-URL discovery (recent-search / advanced-search)', async () => {
    const officialCalls = stubFetchOnce(OFFICIAL_BODY);
    await new OfficialMentionsProvider({
      bearerToken: 'x',
      userId: '1',
      handle: 'ergoraffle',
      searchDomains: ['ergoraffle.com'],
      baseUrl: 'https://example.test',
    }).fetchMentions(null);

    const thirdpartyCalls = stubFetchOnce(THIRDPARTY_BODY);
    await new ThirdPartyMentionsProvider({
      apiKey: 'x',
      handle: 'ergoraffle',
      searchDomains: ['ergoraffle.com'],
      baseUrl: 'https://example.test',
    }).fetchMentions(null);

    // URLSearchParams form-encodes spaces as '+'; normalize back to spaces before matching.
    const decode = (u: string) => decodeURIComponent(u).replace(/\+/g, ' ');

    // Official uses the recent-search endpoint with the discovery query.
    const officialUrl = decode(officialCalls.urls[0]);
    expect(officialUrl).toContain('/2/tweets/search/recent');
    expect(officialUrl).toContain('(@ergoraffle OR url:ergoraffle.com)');

    // Third-party uses advanced_search with the same discovery query.
    const thirdpartyUrl = decode(thirdpartyCalls.urls[0]);
    expect(thirdpartyUrl).toContain('/twitter/tweet/advanced_search');
    expect(thirdpartyUrl).toContain('(@ergoraffle OR url:ergoraffle.com)');
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

describe('buildDiscoveryQuery', () => {
  it('combines the mention and url prongs into an OR group', () => {
    expect(buildDiscoveryQuery('ergoraffle', ['ergoraffle.com'])).toBe(
      '(@ergoraffle OR url:ergoraffle.com)',
    );
    expect(
      buildDiscoveryQuery('ergoraffle', ['ergoraffle.com', 'rosen.tech']),
    ).toBe('(@ergoraffle OR url:ergoraffle.com OR url:rosen.tech)');
  });

  it('falls back to the bare mention when no domains are given', () => {
    expect(buildDiscoveryQuery('ergoraffle', [])).toBe('@ergoraffle');
  });
});
