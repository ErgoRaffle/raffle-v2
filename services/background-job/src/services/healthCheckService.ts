import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { HealthCheck } from '@rosen-bridge/health-check';
import { DiscordNotification } from '@rosen-bridge/discord-notification';
import { ScannerSyncHealthCheckParam } from '@rosen-bridge/scanner-sync-check';

import { ScannerService } from './scannerService';
import { configs } from '../config';
import { ERGO_BLOCK_TIME, ERGO_CHAIN_NAME } from '../constants';
import { DbService } from './dbService';

export class HealthCheckService extends AbstractService {
  name = 'HealthCheckService';
  protected dependencies: Dependency[] = [
    {
      serviceName: ScannerService.name,
      allowedStatuses: [ServiceStatus.started],
    },
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  private static instance?: HealthCheckService;
  private healthCheck: HealthCheck;
  private scheduledJob?: NodeJS.Timeout;
  private isJobRunning = false;
  private continueStop = () => {
    return;
  };
  private shouldStopJob = false;

  private constructor(
    private interval: number,
    logger?: AbstractLogger,
  ) {
    super(logger);
    let notify;
    let notificationConfig;
    if (configs.notification && configs.notification.discordWebHookUrl) {
      const discordNotification = new DiscordNotification(
        configs.notification.discordWebHookUrl,
      );
      notify = discordNotification.notify;
      notificationConfig = {
        historyConfig: {
          cleanupThreshold: configs.notification.historyCleanupTimeout,
        },
        notificationCheckConfig: {
          hasBeenUnstableForAWhile: {
            windowDuration:
              configs.notification.hasBeenUnstableForAWhileWindowDuration,
          },
          hasBeenUnknownForAWhile: {
            windowDuration:
              configs.notification.hasBeenUnknownForAWhileWindowDuration,
          },
        },
      };
    }
    // Create the health check instance
    this.healthCheck = new HealthCheck(notify, notificationConfig);

    // Instantiate scanner sync health parameter
    const scannerSyncHealth = new ScannerSyncHealthCheckParam(
      ERGO_CHAIN_NAME,
      () =>
        DbService.getInstance().getLastBlock(
          ScannerService.getInstance().ergoScanner.name(),
        ),
      configs.healthCheck.warnBlockGap,
      configs.healthCheck.criticalBlockGap,
      ERGO_BLOCK_TIME,
    );
    this.healthCheck.register(scannerSyncHealth);
  }

  /**
   * initializes the singleton instance of HealthCheckService
   *
   * @static
   * @param {number} interval
   * @param {AbstractLogger} [logger]
   * @memberof HealthCheckService
   */
  static init = (interval: number, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new HealthCheckService(interval, logger);
  };

  /**
   * returns the singleton instance of HealthCheckService
   *
   * @static
   * @return {HealthCheckService}
   * @memberof HealthCheckService
   */
  static getInstance = (): HealthCheckService => {
    if (!this.instance) {
      throw new Error('HealthCheckService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * starts the service. following steps are performed:
   *  - registers scanner sync health parameter
   *  - starts the health check server
   *  - service status is set to running
   *
   * @protected
   * @return {Promise<boolean>} true if service started successfully, otherwise
   * false
   * @memberof HealthCheckService
   */
  protected start = async (): Promise<boolean> => {
    this.job();
    this.setStatus(ServiceStatus.running);
    this.logger.info(`Health check service started`);
    return true;
  };

  /**
   * stops the service. following steps are performed:
   *  - stops the health check server
   *  - service's status is set to dormant
   *
   * @protected
   * @return {Promise<boolean>} true if service stopped successfully, otherwise
   * false
   * @memberof HealthCheckService
   */
  protected stop = async (): Promise<boolean> => {
    try {
      if (this.isJobRunning) {
        await new Promise<void>((resolve) => {
          this.shouldStopJob = true;
          this.continueStop = resolve;
        });
      }
      clearTimeout(this.scheduledJob);
      this.setStatus(ServiceStatus.dormant);
      this.logger.info('Health check service stopped');
    } catch (e) {
      this.logger.error(
        `Something went wrong while stopping the ${this.name}: ${e}`,
      );
      return false;
    }
    return true;
  };

  /**
   * executes health check update job and schedules its next run
   *
   * @protected
   * @return {Promise<void>}
   * @memberof HealthCheckService
   */
  protected job = async (): Promise<void> => {
    try {
      this.isJobRunning = true;
      await this.healthCheck.update();
      this.logger.debug('Health check parameters updated');
    } catch (e) {
      if (e instanceof AggregateError) {
        this.logger.warn(
          `Health check update job failed: ${e.errors.map(
            (error) => error.message,
          )}`,
        );
      } else this.logger.warn(`Health check update job failed: ${e}`);
      if (e instanceof Error && e.stack) {
        this.logger.debug(e.stack);
      }
    } finally {
      this.isJobRunning = false;
    }
    this.scheduledJob = setTimeout(this.job, this.interval * 1000);
    if (this.shouldStopJob) {
      this.shouldStopJob = false;
      this.continueStop();
    }
  };
}
