import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import { createDataSource } from '@ergo-raffle/data-source';
import { RaffleViewActions } from '@ergo-raffle/db-views';

import BlockAction from '../actions/block';
import ServiceBoxAction from '../actions/service';
import * as ConfigTypes from '../types/configs';

export class DbService extends AbstractService {
  name = 'DbService';
  private static instance: DbService;
  readonly dataSource: DataSource;

  private serviceAction?: ServiceBoxAction;
  private blockAction?: BlockAction;
  private raffleViewAction?: RaffleViewActions;

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
      this.serviceAction = new ServiceBoxAction(this.dataSource);
      this.logger.debug('Service action initialized');
      this.blockAction = new BlockAction(this.dataSource);
      this.logger.debug('Block action initialized');
      this.raffleViewAction = new RaffleViewActions(this.dataSource);
      this.logger.debug('Raffle view action initialized');
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
    delete this.serviceAction;
    delete this.blockAction;
    delete this.raffleViewAction;
    this.serviceAction = undefined;
    this.blockAction = undefined;
    this.raffleViewAction = undefined;
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  getServiceAction = (): ServiceBoxAction => {
    if (this.serviceAction) return this.serviceAction;
    throw new Error('Service does not started');
  };

  getBlockAction = () => {
    if (this.blockAction) return this.blockAction;
    throw new Error('Service does not started');
  };

  getRaffleViewAction = (): RaffleViewActions => {
    if (this.raffleViewAction) return this.raffleViewAction;
    throw new Error('Service does not started');
  };
}
