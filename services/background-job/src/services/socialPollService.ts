import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import {
  firstRaffleId,
  makeMentionsProvider,
  NewSocialPost,
  passesFilters,
  ProviderConfig,
  SocialAction,
  XMentionsProvider,
} from '@ergo-raffle/social';

import { Social as SocialConfig } from '../types';
import { DbService } from './dbService';

/**
 * Periodic poller that ingests X.com mentions of @ergoraffle into the social store.
 *
 * Mirrors `ScannerService`: extends `AbstractService`, reschedules itself with `setTimeout` on the
 * configured interval, and depends on `DbService` being running. Each tick:
 *  1. reads the per-provider high-water-mark cursor,
 *  2. fetches new mentions from the configured provider (one account-level call for all raffles),
 *  3. buckets each mention to a raffle via the raffle URL in the tweet,
 *  4. applies the spam filters, and
 *  5. stores accepted posts (idempotent) and advances the cursor.
 *
 * Credentials live only here. If the active provider is not configured (no key/token yet), the
 * tick logs a warning and reschedules without calling out — the service stays healthy so the rest
 * of the system is unaffected.
 */
export class SocialPollService extends AbstractService {
  name = 'SocialPollService';
  private static instance: SocialPollService;
  private readonly config: SocialConfig;
  private readonly provider: XMentionsProvider;
  private shouldStop = false;
  private latestTimeOut: undefined | ReturnType<typeof setTimeout>;
  private continueStop = () => {
    return;
  };

  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  private constructor(config: SocialConfig, logger?: AbstractLogger) {
    super(logger);
    this.config = config;
    this.provider = makeMentionsProvider(
      this.toProviderConfig(config),
      this.logger.child('mentionsProvider'),
    );
  }

  /**
   * Initializes the singleton instance of SocialPollService.
   * @param config - the `social` config section
   * @param logger - optional logger
   */
  static readonly init = (config: SocialConfig, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new SocialPollService(config, logger);
  };

  /**
   * Returns the singleton instance of SocialPollService.
   */
  static readonly getInstance = (): SocialPollService => {
    if (!this.instance) {
      throw new Error('SocialPollService instance is not initialized yet');
    }
    return this.instance;
  };

  /** Build the provider abstraction config from the service `social` config. */
  private toProviderConfig = (config: SocialConfig): ProviderConfig => ({
    provider: config.provider,
    official: {
      bearerToken: config.official.bearerToken,
      userId: config.userId,
      handle: config.handle,
      searchDomains: config.searchDomains,
      maxPages: config.official.maxPages,
    },
    thirdparty: {
      apiKey: config.thirdparty.apiKey,
      handle: config.handle,
      searchDomains: config.searchDomains,
      maxPages: config.thirdparty.maxPages,
    },
  });

  /**
   * Whether the active provider has the credentials it needs to run. When false the tick is
   * skipped (so the deferred handle/keys don't break the service).
   */
  private isProviderConfigured = (): boolean => {
    if (this.config.provider === 'official') {
      return Boolean(this.config.official.bearerToken && this.config.userId);
    }
    return Boolean(this.config.thirdparty.apiKey);
  };

  protected start = async (): Promise<boolean> => {
    this.shouldStop = false;
    this.setStatus(ServiceStatus.running);
    return await this.fetchData();
  };

  /**
   * One poll tick: fetch → bucket → filter → store → advance cursor. Always reschedules itself.
   */
  protected fetchData = async (): Promise<boolean> => {
    this.latestTimeOut = undefined;
    try {
      if (!this.isProviderConfigured()) {
        this.logger.warn(
          `SocialPollService: provider '${this.config.provider}' is not configured; skipping poll`,
        );
      } else {
        await this.poll();
      }
    } catch (err) {
      this.logger.error(`SocialPollService fetchData failed: ${err}`);
      if (err instanceof Error && err.stack) this.logger.error(err.stack);
    }

    const scheduled = setTimeout(
      () => this.fetchData(),
      this.config.pollInterval * 1000,
    );
    if (this.shouldStop) {
      this.shouldStop = false;
      clearTimeout(scheduled);
      this.continueStop();
    } else {
      this.latestTimeOut = scheduled;
    }
    return true;
  };

  /** The actual fetch + ingest, factored out of the scheduling wrapper. */
  private poll = async (): Promise<void> => {
    const action = new SocialAction(DbService.getInstance().dataSource);
    const sinceId = await action.getCursor(this.provider.name);
    const mentions = await this.provider.fetchMentions(sinceId);
    this.logger.debug(
      `SocialPollService: fetched ${mentions.length} mention(s) since ${sinceId ?? 'start'}`,
    );

    const now = Date.now();
    const accepted: NewSocialPost[] = [];
    // Per-author flood-cap counters keyed `${raffleId}:${handle}`, seeded from stored counts the
    // first time we see a raffle this tick so the cap spans ticks, not just this batch.
    const authorCounts = new Map<string, number>();
    const seededRaffles = new Set<string>();
    let maxId = sinceId;

    for (const mention of mentions) {
      maxId = this.maxTweetId(maxId, mention.tweetId);

      // The raffle URL is the identifier: a post qualifies by linking a raffle on an allow-listed
      // host, whether or not it also mentions @ergoraffle. Posts with no resolvable raffle link are
      // dropped (we can't know which raffle they belong to).
      const raffleId = firstRaffleId(mention.urls, this.config.allowHosts);
      if (!raffleId) continue;

      if (!seededRaffles.has(raffleId)) {
        const stored = await action.countByAuthorForRaffle(raffleId);
        for (const [handle, count] of stored) {
          authorCounts.set(`${raffleId}:${handle}`, count);
        }
        seededRaffles.add(raffleId);
      }

      if (
        !passesFilters(
          mention,
          raffleId,
          authorCounts,
          this.config.filters,
          new Date(now),
        )
      ) {
        continue;
      }

      accepted.push({
        tweetId: mention.tweetId,
        raffleId,
        authorHandle: mention.authorHandle,
        createdAtMs: mention.createdAt.getTime(),
        fetchedAtMs: now,
      });
    }

    await action.upsertPosts(accepted);
    if (maxId && maxId !== sinceId) {
      await action.setCursor(this.provider.name, maxId);
    }
    this.logger.info(
      `SocialPollService: stored ${accepted.length} new post(s); cursor at ${maxId ?? sinceId ?? 'start'}`,
    );
  };

  /** Return the larger of two snowflake tweet ids (BigInt compare; ids exceed Number range). */
  private maxTweetId = (a: string | null, b: string): string => {
    if (a === null) return b;
    return BigInt(b) > BigInt(a) ? b : a;
  };

  protected stop = async (): Promise<boolean> => {
    clearTimeout(this.latestTimeOut);
    await new Promise<void>((resolve) => {
      this.continueStop = resolve;
      this.shouldStop = true;
    });
    this.setStatus(ServiceStatus.dormant);
    return true;
  };
}
