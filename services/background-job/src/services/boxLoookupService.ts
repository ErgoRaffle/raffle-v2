import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { BoxLookup, Request } from '@ergo-raffle/box-lookup';
import { Network } from '@fleet-sdk/core';

import { TxPotService } from './txPotService';
import { DataProvider } from '@ergo-raffle/box-lookup/lib/dataProvider';
import { DataSource } from 'typeorm';

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
  private dataProvider: DataProvider;
  private boxLookup: BoxLookup;
  private dataProvider: DataProvider;
  private updateInterval: number;

  private constructor(
    dataSource: DataSource,
    updateInterval: number,
    nodeUrl: string,
    networkType: Network,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.dataProvider = new DataProvider(dataSource, nodeUrl);
    this.boxLookup = new BoxLookup(this.dataProvider, networkType, logger);
    this.updateInterval = updateInterval;
  }

  /**
   * Initializes the singleton instance of BoxLookupService
   */
  static init = (
    dataSource: DataSource,
    updateInterval: number,
    nodeUrl: string,
    networkType: Network = Network.Mainnet,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new BoxLookupService(
      dataSource,
      updateInterval,
      nodeUrl,
      networkType,
      logger,
    );
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
    try {
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
    await this.boxLookup.serveRequests();
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
    return this.boxLookup.registerRequest(request);
  };

  /**
   * Removes a request from the box lookup
   * @param requestId - The id of the request to remove
   */
  removeRequest = (requestId: number) => {
    this.boxLookup.unregisterRequest(requestId);
  };
}
