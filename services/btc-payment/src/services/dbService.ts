import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { createDataSource } from '@ergo-raffle/data-source';

import BlockAction from '../actions/block';
import DonationAction from '../actions/donation';
import DynamicBoxAction from '../actions/dynamicBox';
import RaffleAction from '../actions/raffle';
import * as ConfigTypes from '../types/configs';

export class DbService extends AbstractService {
  name = 'DbService';
  private static instance: DbService;
  readonly dataSource: DataSource;

  private raffleAction?: RaffleAction;
  private donationAction?: DonationAction;
  private blockAction?: BlockAction;
  private dynamicBoxAction?: DynamicBoxAction;

  private constructor(
    dbConfigs: ConfigTypes.Database,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.dataSource = createDataSource(dbConfigs);
  }

  /**
   * Initializes the singleton instance of DbService
   */
  static init = (dbConfigs: ConfigTypes.Database, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new DbService(dbConfigs, logger);
  };

  /**
   * Returns the singleton instance of DbService
   */
  static getInstance = (): DbService => {
    if (!this.instance) {
      throw new Error('DbService instance is not initialized yet');
    }
    return this.instance;
  };

  protected dependencies: Dependency[] = [];

  protected start = async (): Promise<boolean> => {
    try {
      this.setStatus(ServiceStatus.started);
      this.logger.debug('Initializing data source');
      await this.dataSource.initialize();
      this.logger.debug('Data source initialized');

      this.logger.debug('Running data source migrations');
      await this.dataSource.runMigrations();
      this.logger.debug('Data source migrations completed');

      this.raffleAction = new RaffleAction(this.dataSource);
      this.logger.debug('Raffle action initialized');
      this.donationAction = new DonationAction(this.dataSource);
      this.logger.debug('Donation action initialized');
      this.blockAction = new BlockAction(this.dataSource);
      this.logger.debug('Block action initialized');
      this.dynamicBoxAction = new DynamicBoxAction(
        this.dataSource,
        this.logger,
      );
      this.logger.debug('DynamicBox action initialized');

      this.setStatus(ServiceStatus.running);
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the DbService: ${e}`,
      );
      return false;
    }
    this.logger.info('DbService started');
    return true;
  };

  protected stop = async (): Promise<boolean> => {
    await this.dataSource.destroy();
    this.raffleAction = undefined;
    this.donationAction = undefined;
    this.blockAction = undefined;
    this.dynamicBoxAction = undefined;
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  getRaffleAction = (): RaffleAction => {
    if (this.raffleAction) return this.raffleAction;
    throw new Error('Service has not started');
  };

  getDonationAction = (): DonationAction => {
    if (this.donationAction) return this.donationAction;
    throw new Error('Service has not started');
  };

  getBlockAction = (): BlockAction => {
    if (this.blockAction) return this.blockAction;
    throw new Error('Service has not started');
  };

  getDynamicBoxAction = (): DynamicBoxAction => {
    if (this.dynamicBoxAction) return this.dynamicBoxAction;
    throw new Error('Service has not started');
  };

  getDataSource = (): DataSource => {
    if (this.dataSource) return this.dataSource;
    throw new Error('Service has not started');
  };
}
