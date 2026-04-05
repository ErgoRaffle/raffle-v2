import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { TokenMap } from '@rosen-bridge/tokens';
import * as fs from 'fs/promises';
import path from 'path';

import { TokenMap as TokenMapConfig } from '../types/configs';

export class TokenMapService extends AbstractService {
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
   * @param tokenMapConfig - Source settings: optional remote `url` and/or local `path`.
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
   * Loads token map JSON from the configured URL or path and loads it into the tokenMap instance.
   *
   * @returns True when the map was loaded and applied, false on error.
   */
  protected start = async (): Promise<boolean> => {
    try {
      this.setStatus(ServiceStatus.started);
      const raw = await this.loadRawJson();
      this.tokenMap = new TokenMap(this.logger.child('tokenMap'));
      await this.tokenMap.updateConfigByJson(JSON.parse(raw).tokens);
      this.logger.info(
        `TokenMapService started with ${this.tokenMap.getTokens('ergo', 'ergo').length} tokens`,
      );
      this.setStatus(ServiceStatus.running);
      this.logger.info('TokenMapService started');
      return true;
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the TokenMapService: ${e}`,
      );
      return false;
    }
  };

  /**
   * Fetches or reads token map JSON as text (URL takes precedence over path).
   *
   * @returns Raw JSON string for the token map.
   */
  private readonly loadRawJson = async (): Promise<string> => {
    if (this.tokenMapConfig.url) {
      this.logger.debug(
        `Loading token map from URL: ${this.tokenMapConfig.url}`,
      );
      const res = await fetch(this.tokenMapConfig.url);
      if (!res.ok) {
        throw new Error(
          `tokenMap URL responded with ${res.status} ${res.statusText}`,
        );
      }
      return await res.text();
    }
    const filePath = path.resolve(this.tokenMapConfig.path!);
    this.logger.debug(`Loading token map from path: ${filePath}`);
    return await fs.readFile(filePath, 'utf-8');
  };

  /**
   * Marks the service dormant and clears the token map instance.
   *
   * @returns True when stopped cleanly.
   */
  protected stop = async (): Promise<boolean> => {
    this.tokenMap = undefined;
    this.setStatus(ServiceStatus.dormant);
    this.logger.info('TokenMapService stopped');
    return true;
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
