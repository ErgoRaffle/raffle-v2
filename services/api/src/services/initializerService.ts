import { AbstractLogger, DefaultLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
  ServiceManager,
} from '@rosen-bridge/service-manager';

import { configs } from '../configs';
import { ApiService } from './apiService';
import { DbService } from './dbService';

export class InitializerService extends AbstractService {
  name = 'InitializerService';
  private static instance?: InitializerService;
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
    this.instance.initializeAllServices();
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

  protected start = async (): Promise<boolean> => {
    try {
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

  protected stop = async (): Promise<boolean> => {
    this.setStatus(ServiceStatus.dormant);
    this.logger.info('InitializerService stopped');
    return true;
  };

  /**
   * Initializes all services
   */
  private initializeAllServices = (): void => {
    const defaultLogger = DefaultLogger.getInstance();

    this.logger.debug('Initializing database service');
    DbService.init(configs.database, defaultLogger.child('DbService'));
    this.logger.debug('Database service initialized');

    this.logger.debug('Initializing API service');
    ApiService.init(configs.api, defaultLogger.child('ApiService'));
    this.logger.debug('API service initialized');
  };

  /**
   * Registers all services with the ServiceManager
   */
  private registerAllServices = (): void => {
    this.logger.debug('Registering all services with ServiceManager...');
    this.serviceManager.register(DbService.getInstance());
    this.serviceManager.register(ApiService.getInstance());
  };
}
