import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { TxPot } from '@rosen-bridge/tx-pot';

import { DbService } from './dbService';

export class TxPotService extends AbstractService {
  name = 'TxPotService';
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  private static instance?: TxPotService;

  private constructor(
    private dataSource: DataSource,
    logger?: AbstractLogger,
  ) {
    super(logger);
    TxPot.setup(this.dataSource, this.logger);
  }

  /**
   * initializes the singleton instance of TxPotService
   *
   */
  static init = (dataSource: DataSource, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new TxPotService(dataSource, logger);
  };

  /**
   * returns the singleton instance of TxPotService
   *
   * @static
   * @return {TxPotService}
   * @memberof TxPotService
   */
  static getInstance = (): TxPotService => {
    if (!this.instance) {
      throw new Error('TxPotService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * starts the service. following steps are performed:
   *  - TxPot is setup and Ergo chain is registered
   *  - TxPot update job is executed and scheduled
   *  - service status is set to running
   *
   * @protected
   * @return {Promise<boolean>} true if service started successfully, otherwise
   * false
   * @memberof TxPotService
   */
  protected start = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.running);
    this.logger.info('TxPotService started');
    return true;
  };

  /**
   * stops the service. following steps are performed:
   *  - ths scheduled job is stopped
   *  - service's status is set to dormant
   *
   * @protected
   * @return {Promise<boolean>} true if service stopped successfully, otherwise
   * false
   * @memberof TxPotService
   */
  protected stop = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * Returns the TxPot instance
   * @returns TxPot instance
   */
  getTxPot = (): TxPot => {
    return TxPot.getInstance();
  };
}
