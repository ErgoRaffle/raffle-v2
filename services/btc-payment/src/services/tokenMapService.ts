import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Dependency, PeriodicTaskService } from '@rosen-bridge/service-manager';
import { TokenMap } from '@rosen-bridge/tokens';
import * as fs from 'fs/promises';
import path from 'path';

import { TokenMap as TokenMapConfig } from '../types/configs';

export class TokenMapService extends PeriodicTaskService {
  name = 'TokenMapService';
  private static instance?: TokenMapService;
  private tokenMap?: TokenMap;

  private constructor(
    private readonly tokenMapConfig: TokenMapConfig,
    logger?: AbstractLogger,
  ) {
    super(logger);
  }

  /**
   * Initializes the singleton TokenMapService (no-op if already initialized).
   *
   * @param tokenMapConfig - Source settings
   * @param logger - Optional logger for this service.
   */
  static readonly init = (
    tokenMapConfig: TokenMapConfig,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new TokenMapService(tokenMapConfig, logger);
  };

  /**
   * Returns the singleton TokenMapService instance.
   *
   * @returns The initialized TokenMapService.
   */
  static readonly getInstance = (): TokenMapService => {
    if (!this.instance) {
      throw new Error('TokenMapService instance is not initialized yet');
    }
    return this.instance;
  };

  protected dependencies: Dependency[] = [];

  /**
   * Creates the TokenMap instance and performs the initial load from URL or local path.
   *
   * @returns Resolves when the initial map is applied.
   */
  protected preStart = async (): Promise<void> => {
    this.tokenMap = new TokenMap(this.logger.child('tokenMap'));
    const raw = await this.loadRawJson();
    await this.applyTokenMapJson(raw);
    this.logger.info(
      `TokenMapService initial load done (${this.tokenMap.getTokens('ergo', 'ergo').length} ergo-ergo token entries)`,
    );
  };

  /**
   * Clears the TokenMap instance after periodic tasks stop.
   *
   * @returns Resolves when cleanup is finished.
   */
  protected postStop = async (): Promise<void> => {
    this.tokenMap = undefined;
    this.logger.info('TokenMapService stopped');
  };

  /**
   * Defines periodic work: refresh token map from `url` when configured.
   *
   * @returns Task list; includes a URL refresh task only when `tokenMap.url` is set.
   */
  protected getTasks = () => {
    if (this.tokenMapConfig.type === 'file') {
      return [];
    }
    const refreshTokenMapFromUrl = async () => {
      try {
        const raw = await this.fetchRawFromUrl(this.tokenMapConfig.url!);
        await this.applyTokenMapJson(raw);
        this.logger.debug('Token map refreshed from URL');
      } catch (err) {
        this.logger.error(`Token map URL refresh failed: ${err}`);
      }
    };
    return [
      {
        fn: refreshTokenMapFromUrl,
        interval: this.tokenMapConfig.refreshIntrval! * 1000,
      },
    ];
  };

  /**
   * Applies raw JSON text to the current TokenMap instance.
   *
   * @param raw - JSON string from file or HTTP body.
   * @returns Resolves when `updateConfigByJson` completes.
   */
  private readonly applyTokenMapJson = async (raw: string): Promise<void> => {
    if (!this.tokenMap) {
      throw new Error('TokenMap instance is not initialized');
    }
    const parsed = JSON.parse(raw);
    await this.tokenMap.updateConfigByJson(parsed.tokens);
  };

  /**
   * Fetches token map JSON from the configured URL.
   *
   * @param url - HTTP(S) URL for the token map document.
   * @returns Raw response body as text.
   */
  private readonly fetchRawFromUrl = async (url: string): Promise<string> => {
    this.logger.debug(`Fetching token map from URL: ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `tokenMap URL responded with ${res.status} ${res.statusText}`,
      );
    }
    return await res.text();
  };

  /**
   * Loads token map JSON from URL (if set) or from the configured filesystem path.
   *
   * @returns Raw JSON string for the token map.
   */
  private readonly loadRawJson = async (): Promise<string> => {
    if (this.tokenMapConfig.type === 'url') {
      return await this.fetchRawFromUrl(this.tokenMapConfig.url!);
    }
    const filePath = path.resolve(this.tokenMapConfig.path!);
    this.logger.debug(`Loading token map from path: ${filePath}`);
    return await fs.readFile(filePath, 'utf-8');
  };

  /**
   * Returns the rosen-bridge token map instance (available after the service is running).
   *
   * @returns The rosen-bridge token map instance.
   */
  getTokenMap = (): TokenMap => {
    if (!this.tokenMap) {
      throw new Error('TokenMapService has not started');
    }
    return this.tokenMap;
  };
}
