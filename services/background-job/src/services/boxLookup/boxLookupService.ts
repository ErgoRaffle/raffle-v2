import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { BoxLookup } from '@ergo-raffle/box-lookup';

import { TxPotService } from '../txPotService';
import { deserializeTxForBoxLookup, toBoxLookupRequest } from './compat';
import { Request } from '../../types';

export class BoxLookupService extends AbstractService {
  name = 'BoxLookupService';
  protected dependencies: Dependency[] = [
    {
      serviceName: TxPotService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];
  private static instance?: BoxLookupService;
  private isJobRunning = false;
  private scheduledJob?: NodeJS.Timeout;
  private continueStop: () => void = () => {
    return;
  };
  private shouldStopJob = false;
  private boxLookup: BoxLookup;
  private updateInterval: number;

  private constructor(
    updateInterval: number,
    nodeUrl: string,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.boxLookup = new BoxLookup(
      TxPotService.getInstance().getTxPot(),
      nodeUrl,
      deserializeTxForBoxLookup,
      logger,
    );
    this.updateInterval = updateInterval;
  }

  /**
   * Initializes the singleton instance of BoxLookupService
   */
  static init = (
    updateInterval: number,
    nodeUrl: string,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new BoxLookupService(updateInterval, nodeUrl, logger);
  };

  /**
   * Returns the singleton instance of BoxLookupService
   */
  static getInstance = (): BoxLookupService => {
    if (!this.instance) {
      throw new Error('BoxLookupService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * Starts the service: schedules the periodic box lookup job
   */
  protected start = async (): Promise<boolean> => {
    this.job();
    this.setStatus(ServiceStatus.running);
    this.logger.info('Box lookup service started');
    return true;
  };

  /**
   * Stops the service: cancels the scheduled job
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
   * Executes the box lookup job and schedules its next run
   */
  protected job = async (): Promise<void> => {
    this.isJobRunning = true;
    try {
      await this.boxLookup.serveRequests();
    } catch (error) {
      this.logger.error(
        `Unexpected error in box lookup serving requests: ${error instanceof Error ? error.message : error}`,
      );
    }
    this.scheduledJob = setTimeout(this.job, this.updateInterval * 1000);
    this.isJobRunning = false;
    if (this.shouldStopJob) {
      this.shouldStopJob = false;
      this.continueStop();
    }
  };

  /**
   * Adds a request to the box lookup
   * @param request - The request to add
   */
  addRequest = (request: Request): number => {
    return this.boxLookup.registerRequest(toBoxLookupRequest(request));
  };

  /**
   * Removes a request from the box lookup
   * @param requestId - The id of the request to remove
   */
  removeRequest = (requestId: number) => {
    this.boxLookup.unregisterRequest(requestId);
  };
}
