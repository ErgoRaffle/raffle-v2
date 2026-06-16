import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { buildDiscoveryQuery } from './discoveryQuery';
import { RawMention, XMentionsProvider } from './types';

/** Config for the third-party provider (twitterapi.io). Credentials come from service env. */
export interface ThirdPartyProviderConfig {
  /** API key. Server-side only. Sent as the `X-API-Key` header. */
  readonly apiKey: string;
  /** Handle (without '@') searched as a mention, e.g. "ergoraffle". */
  readonly handle: string;
  /** Raffle domains matched in tweet URLs (the `url:` discovery prong). Default []. */
  readonly searchDomains?: readonly string[];
  /** Max pages to follow per tick (cost cap). Default 5. */
  readonly maxPages?: number;
  /** Override base URL (tests). Default https://api.twitterapi.io. */
  readonly baseUrl?: string;
}

// ── Shape of the twitterapi.io advanced-search response (fields we use) ──
// Field names verified against the live twitterapi.io advanced-search docs (2026-06): top-level
// `tweets` / `has_next_page` / `next_cursor`; per-tweet `id` / `text` / `createdAt` /
// `retweeted_tweet` / `entities.urls[].expanded_url`; `author.userName` / `createdAt` / `followers`.
// `createdAt` is X's "Tue Dec 10 07:00:30 +0000 2024" format, which `new Date(...)` parses.
// Provider-specific shape stays isolated here — only `mapTweet` changes if the API evolves.
// (End-to-end run against a live key is still pending — see TODO(provider-creds).)
interface TaTweet {
  id: string;
  text?: string;
  createdAt?: string;
  retweeted_tweet?: unknown;
  entities?: { urls?: Array<{ expanded_url?: string; url?: string }> };
  author?: {
    userName?: string;
    createdAt?: string;
    followers?: number;
  };
}
interface TaSearchResponse {
  tweets?: TaTweet[];
  has_next_page?: boolean;
  next_cursor?: string;
}

/**
 * Third-party (twitterapi.io) provider — the default. Cheaper than the official API and needs no
 * OAuth. Runs an advanced search that discovers posts mentioning `@handle` OR linking a raffle
 * domain (see `buildDiscoveryQuery`), newest-first, and normalizes each result into a `RawMention`.
 * Incremental polling is expressed with the `since_id:` search operator.
 */
export class ThirdPartyMentionsProvider implements XMentionsProvider {
  readonly name = 'thirdparty' as const;
  private readonly logger: AbstractLogger;

  constructor(
    private readonly config: ThirdPartyProviderConfig,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ?? new DummyLogger();
  }

  fetchMentions = async (sinceId: string | null): Promise<RawMention[]> => {
    const base = this.config.baseUrl ?? 'https://api.twitterapi.io';
    const maxPages = this.config.maxPages ?? 5;
    const discovery = buildDiscoveryQuery(
      this.config.handle,
      this.config.searchDomains ?? [],
    );
    // `since_id:` is AND-ed onto the discovery group for incremental polling.
    const query = sinceId ? `${discovery} since_id:${sinceId}` : discovery;

    const mentions: RawMention[] = [];
    let cursor: string | undefined;
    let page = 0;

    do {
      const url = new URL(`${base}/twitter/tweet/advanced_search`);
      url.searchParams.set('query', query);
      url.searchParams.set('queryType', 'Latest');
      if (cursor) url.searchParams.set('cursor', cursor);

      const response = await fetch(url, {
        headers: { 'X-API-Key': this.config.apiKey },
      });
      if (!response.ok) {
        this.logger.warn(
          `twitterapi.io returned ${response.status} ${response.statusText}`,
        );
        break;
      }
      const body = (await response.json()) as TaSearchResponse;
      for (const tweet of body.tweets ?? []) {
        mentions.push(this.mapTweet(tweet));
      }
      cursor = body.has_next_page ? body.next_cursor : undefined;
      page += 1;
    } while (cursor && page < maxPages);

    return mentions;
  };

  /** Normalize one twitterapi.io tweet into a RawMention. */
  private mapTweet = (tweet: TaTweet): RawMention => {
    const urls = (tweet.entities?.urls ?? [])
      .map((entry) => entry.expanded_url ?? entry.url)
      .filter((value): value is string => Boolean(value));
    return {
      tweetId: tweet.id,
      authorHandle: tweet.author?.userName ?? '',
      createdAt: tweet.createdAt ? new Date(tweet.createdAt) : new Date(),
      urls,
      text: tweet.text ?? '',
      isRetweet: Boolean(tweet.retweeted_tweet),
      authorCreatedAt: tweet.author?.createdAt
        ? new Date(tweet.author.createdAt)
        : undefined,
      authorFollowers: tweet.author?.followers,
    };
  };
}
