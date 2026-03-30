import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { makeFastify, FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import packageJson from '../../../package.json' with { type: 'json' };
import * as ConfigTypes from '../../types/configs';
import { DbService } from '../dbService';
import { ScannerService } from '../scannerService';
import { registerHealthRoute } from './healthRoute';

export class ApiService extends AbstractService {
  name = 'ApiService';
  private static instance?: ApiService;
  private fastify?: FastifyWithZod;

  private constructor(
    private apiConfig: ConfigTypes.Api,
    logger?: AbstractLogger,
  ) {
    super(logger);
  }

  static init = (apiConfig: ConfigTypes.Api, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new ApiService(apiConfig, logger);
  };

  static getInstance = (): ApiService => {
    if (!this.instance) {
      throw new Error('ApiService instance is not initialized yet');
    }
    return this.instance;
  };

  protected dependencies: Dependency[] = [
    {
      serviceName: DbService.name,
      allowedStatuses: [ServiceStatus.running],
    },
    {
      serviceName: ScannerService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  protected start = async (): Promise<boolean> => {
    try {
      this.setStatus(ServiceStatus.started);
      this.fastify = await makeFastify(
        {
          path: '/swagger',
          title: 'Ergo Raffle Background Job API',
          description: 'API for Ergo Raffle background job service',
          version: packageJson.version,
        },
        { logger: true },
      );

      await this.registerRoutes();

      await this.fastify.listen({
        host: this.apiConfig.host,
        port: this.apiConfig.port,
      });

      this.logger.info(`API service started on port ${this.apiConfig.port}`);
      this.setStatus(ServiceStatus.running);
    } catch (e) {
      this.logger.error(
        `Something went wrong while starting the ${this.name}: ${e}`,
      );
      return false;
    }
    return true;
  };

  protected stop = async (): Promise<boolean> => {
    try {
      await this.fastify?.close();
      this.logger.info('API service stopped');
      this.setStatus(ServiceStatus.dormant);
    } catch (e) {
      this.logger.error(
        `Something went wrong while stopping the ${this.name}: ${e}`,
      );
      return false;
    }
    return true;
  };

  private registerRoutes = async (): Promise<void> => {
    if (!this.fastify) return;
    registerHealthRoute(this.fastify);
  };
}
