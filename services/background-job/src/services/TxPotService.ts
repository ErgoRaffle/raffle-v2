import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { TxPot } from '@rosen-bridge/tx-pot';
import { DataSource } from 'typeorm';
import { ErgoNetworkInterface } from '../txPot/ergoNetworkInterface';
import { DbService } from './DbService';
import * as constants from '../constants';

export class TxPotService extends AbstractService {
  name = 'TxPotService';
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  private static instance?: TxPotService;
  private isJobRunning = false;
  private scheduledJob?: NodeJS.Timeout;
  private continueStop: () => void = () => {
    return;
  };
  private shouldStopJob = false;

  private constructor(
    private updateInterval: number,
    private dataSource: DataSource,
    private nodeUrl: string,
    private txRequiredConfirmations: number,
    logger?: AbstractLogger,
  ) {
    super(logger);
  }

  /**
   * initializes the singleton instance of TxPotService
   *
   */
  static init = (
    updateInterval: number,
    dataSource: DataSource,
    nodeUrl: string,
    txRequiredConfirmations: number,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new TxPotService(
      updateInterval,
      dataSource,
      nodeUrl,
      txRequiredConfirmations,
      logger,
    );
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
    try {
      TxPot.setup(this.dataSource, this.logger).registerChain(
        constants.ERGO_CHAIN_NAME,
        new ErgoNetworkInterface(
          this.nodeUrl,
          this.txRequiredConfirmations,
          this.logger,
        ),
      );
      this.job();
      this.setStatus(ServiceStatus.running);
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the ${this.name}: ${e}`,
      );
      return false;
    }
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
    if (this.isJobRunning) {
      await new Promise<void>((resolve) => {
        this.continueStop = resolve;
        this.shouldStopJob = true;
      });
    }
    clearTimeout(this.scheduledJob);
    this.shouldStopJob = false;
    this.setStatus(ServiceStatus.dormant);
    return true;
  };

  /**
   * executes TxPot update job and schedules its next run
   *
   * @protected
   * @return {Promise<void>}
   * @memberof TxPotService
   */
  protected job = async (): Promise<void> => {
    this.isJobRunning = true;
    await TxPot.getInstance().update();
    this.scheduledJob = setTimeout(this.job, this.updateInterval * 1000);
    this.isJobRunning = false;
    if (this.shouldStopJob) {
      this.shouldStopJob = false;
      this.continueStop();
    }
  };

  /**
   * Returns the TxPot instance
   * @returns TxPot instance
   */
  getTxPot = (): TxPot => {
    return TxPot.getInstance();
  };
}
