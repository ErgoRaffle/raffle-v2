import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
  ServiceManager,
} from '@rosen-bridge/service-manager';

import { configs } from '../configs';
import dataSource from '../dataSource';
import { ApiService } from './apiService';
import { DbService } from './dbService';

export class InitializerService extends AbstractService {
  name = 'InitializerService';
  private static instance?: InitializerService;
  private isInitialized = false;
  private serviceManager: ServiceManager;

  private constructor(serviceManager: ServiceManager, logger?: AbstractLogger) {
    super(logger);
    this.serviceManager = serviceManager;
  }

  /**
   * Initializes the singleton instance of InitializerService
   */
  static init = async (
    serviceManager: ServiceManager,
    logger?: AbstractLogger,
  ) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new InitializerService(serviceManager, logger);
    await this.instance.initializeAllServices();
    this.instance.registerAllServices();
  };

  /**
   * Returns the singleton instance of InitializerService
   */
  static getInstance = (): InitializerService => {
    if (!this.instance) {
      throw new Error('InitializerService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * Returns the dependencies of the InitializerService
   */
  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: ApiService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  /**
   * Starts the service by initializing all other services
   */
  protected start = async (): Promise<boolean> => {
    try {
      this.isInitialized = true;
      this.setStatus(ServiceStatus.running);
      this.logger.info('InitializerService started successfully');
      return true;
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the ${this.name}: ${e}`,
      );
      return false;
    }
  };

  /**
   * Stops the service
   */
  protected stop = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.dormant);
    this.logger.info('InitializerService stopped');
    return true;
  };

  /**
   * Initializes all services in the system
   */
  private initializeAllServices = async (): Promise<void> => {
    // Create logger instances for each service
    const defaultLogger = DefaultLogger.getInstance();

    const dbLogger = defaultLogger.child('DbService');
    const apiLogger = defaultLogger.child('ApiService');

    // Initialize database service
    this.logger.debug('Initializing database service');
    DbService.init(dataSource, dbLogger);
    this.logger.debug('Database service initialized');

    // Initialize api service
    this.logger.debug('Initializing api service');
    ApiService.init(configs.api, apiLogger);
    this.logger.debug('Api service initialized');
  };

  /**
   * Checks if all services have been initialized
   */
  public isServicesInitialized = (): boolean => {
    return this.isInitialized;
  };

  /**
   * Registers all services with the ServiceManager
   */
  private registerAllServices = async (): Promise<void> => {
    this.logger.debug('Registering all services with ServiceManager...');
    // Register all services
    this.serviceManager.register(DbService.getInstance());
  };
}
