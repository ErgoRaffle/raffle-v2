import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { buildDiscoveryQuery } from './discoveryQuery';
import { RawMention, XMentionsProvider } from './types';

/** Config for the official X API provider. Credentials come from service env. */
export interface OfficialProviderConfig {
  /** App bearer token (pay-per-use). Server-side only. */
  readonly bearerToken: string;
  /** Numeric user id of the @ergoraffle account (kept for reference; recent-search needs no id). */
  readonly userId: string;
  /** Handle (without '@') searched as a mention. */
  readonly handle: string;
  /** Raffle domains matched in tweet URLs (the `url:` discovery prong). Default []. */
  readonly searchDomains?: readonly string[];
  /** Max pages to follow per tick (cost cap). Default 5 (≤ 500 tweets/tick). */
  readonly maxPages?: number;
  /** Override base URL (tests). Default https://api.twitter.com. */
  readonly baseUrl?: string;
}

// ── Minimal shapes of the X API v2 response we read (only the fields we use) ──
interface XUser {
  id: string;
  username: string;
  created_at?: string;
  public_metrics?: { followers_count?: number };
}
interface XTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  entities?: {
    urls?: Array<{ expanded_url?: string; url?: string }>;
  };
  referenced_tweets?: Array<{ type: string }>;
}
interface XSearchResponse {
  data?: XTweet[];
  includes?: { users?: XUser[] };
  meta?: { next_token?: string };
}

/**
 * Official X API v2 provider.
 *
 * Polls `GET /2/tweets/search/recent` (pay-per-use) with a query that discovers posts mentioning
 * `@handle` OR linking a raffle domain (see `buildDiscoveryQuery`) — recent search is used instead
 * of the mentions endpoint precisely so link-only posts are found. Requests the tweet/user fields
 * needed for the URL match and the spam filters, follows pagination up to `maxPages`, and
 * normalizes every tweet into a `RawMention`. All X-specific shapes stay inside this file.
 */
export class OfficialMentionsProvider implements XMentionsProvider {
  readonly name = 'official' as const;
  private readonly logger: AbstractLogger;

  constructor(
    private readonly config: OfficialProviderConfig,
    logger?: AbstractLogger,
  ) {
    this.logger = logger ?? new DummyLogger();
  }

  fetchMentions = async (sinceId: string | null): Promise<RawMention[]> => {
    const base = this.config.baseUrl ?? 'https://api.twitter.com';
    const maxPages = this.config.maxPages ?? 5;
    const query = buildDiscoveryQuery(
      this.config.handle,
      this.config.searchDomains ?? [],
    );
    const mentions: RawMention[] = [];
    let pageToken: string | undefined;
    let page = 0;

    do {
      const url = new URL(`${base}/2/tweets/search/recent`);
      url.searchParams.set('query', query);
      url.searchParams.set('max_results', '100');
      url.searchParams.set(
        'tweet.fields',
        'created_at,entities,referenced_tweets',
      );
      url.searchParams.set('expansions', 'author_id');
      url.searchParams.set('user.fields', 'username,created_at,public_metrics');
      if (sinceId) url.searchParams.set('since_id', sinceId);
      // recent-search paginates with `next_token` (echoed back as meta.next_token).
      if (pageToken) url.searchParams.set('next_token', pageToken);

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.config.bearerToken}` },
      });
      if (!response.ok) {
        // Surface and stop; the poller keeps the cursor so this page is retried next tick.
        this.logger.warn(
          `Official X API returned ${response.status} ${response.statusText}`,
        );
        break;
      }
      const body = (await response.json()) as XSearchResponse;
      const usersById = new Map(
        (body.includes?.users ?? []).map((user) => [user.id, user]),
      );
      for (const tweet of body.data ?? []) {
        mentions.push(this.toMention(tweet, usersById));
      }
      pageToken = body.meta?.next_token;
      page += 1;
    } while (pageToken && page < maxPages);

    return mentions;
  };

  /** Normalize one X tweet (+ its author) into a RawMention. */
  private toMention = (
    tweet: XTweet,
    usersById: Map<string, XUser>,
  ): RawMention => {
    const author = tweet.author_id ? usersById.get(tweet.author_id) : undefined;
    const urls = (tweet.entities?.urls ?? [])
      .map((entry) => entry.expanded_url ?? entry.url)
      .filter((value): value is string => Boolean(value));
    const isRetweet = (tweet.referenced_tweets ?? []).some(
      (ref) => ref.type === 'retweeted',
    );
    return {
      tweetId: tweet.id,
      authorHandle: author?.username ?? '',
      createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
      urls,
      text: tweet.text ?? '',
      isRetweet,
      authorCreatedAt: author?.created_at
        ? new Date(author.created_at)
        : undefined,
      authorFollowers: author?.public_metrics?.followers_count,
    };
  };
}
