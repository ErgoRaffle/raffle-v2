import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  Dependency,
  PeriodicTaskService,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { TokenAction } from '@ergo-raffle/tokens';

import { configs } from '../config';
import { DbService } from './dbService';

export class TokenDetailsService extends PeriodicTaskService {
  name = 'TokenDetailsService';
  private static instance?: TokenDetailsService;
  private tokenAction: TokenAction;
  private updateHeight = 0;

  private constructor(
    private readonly nodeUrl: string,
    logger?: AbstractLogger,
  ) {
    super(logger);
    const dbService = DbService.getInstance();
    this.tokenAction = new TokenAction(
      dbService.dataSource,
      this.nodeUrl,
      this.logger,
    );
  }

  /**
   * @param nodeUrl - Ergo node base URL for fetching token metadata
   * @param logger - Optional logger instance
   */
  static readonly init = (nodeUrl: string, logger?: AbstractLogger) => {
    if (this.instance != undefined) return;
    this.instance = new TokenDetailsService(nodeUrl, logger);
  };

  /**
   * @returns The singleton TokenDetailsService instance
   */
  static readonly getInstance = (): TokenDetailsService => {
    if (!this.instance) {
      throw new Error('TokenDetailsService instance is not initialized yet');
    }
    return this.instance;
  };

  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  /**
   * Syncs the token details for the existing inactive raffles
   * Sets the update height to the highest height of the inactive raffles
   */
  protected preStart = async (): Promise<void> => {
    const inactiveRaffles =
      await DbService.getInstance().getInactiveRaffleBoxes(false);

    const tokenIds = inactiveRaffles
      .map((r) => r.collectingTokenId)
      .filter((id) => id != null);
    this.logger.debug(
      `Found ${tokenIds.length} token ids to update: ${tokenIds.join(', ')}`,
    );
    await this.tokenAction.ensureTokens(tokenIds, false);

    this.updateHeight = inactiveRaffles.reduce(
      (max, r) => Math.max(max, r.height),
      0,
    );

    this.logger.info(
      `Processed ${inactiveRaffles.length} inactive raffles, updateHeight set to ${this.updateHeight}`,
    );
  };

  protected postStop = async (): Promise<void> => {};

  /**
   * Returns the periodic task to check for new inactive raffles and update the token details
   * @returns The tasks to run
   */
  protected getTasks = () => {
    /**
     * Checks for new inactive raffles and updates the token details
     */
    const checkNewInactiveRaffles = async () => {
      this.logger.debug(
        `Checking for new inactive raffles, updateHeight is ${this.updateHeight}`,
      );
      const newRaffles = await DbService.getInstance().getInactiveRaffleBoxes(
        false,
        this.updateHeight,
      );

      if (newRaffles.length === 0) return;
      this.logger.debug(
        `Found ${newRaffles.length} new inactive raffles, updateHeight now ${this.updateHeight}`,
      );
      const tokenIds = newRaffles
        .map((r) => r.collectingTokenId)
        .filter((id): id is string => id != null);
      await this.tokenAction.ensureTokens(tokenIds, false);

      this.updateHeight = newRaffles.reduce(
        (max, r) => Math.max(max, r.height),
        this.updateHeight,
      );
      this.logger.debug(
        `Processed ${newRaffles.length} new inactive raffles tokens, updateHeight now ${this.updateHeight}`,
      );
    };

    return [
      {
        fn: checkNewInactiveRaffles,
        interval: configs.tokenDetails.updateInterval * 1000,
      },
    ];
  };

  getTokenActions = () => {
    return this.tokenAction;
  };
}
