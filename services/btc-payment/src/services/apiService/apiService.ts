import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { makeFastify, FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';

import packageJson from '../../../package.json' with { type: 'json' };
import { AddressDeriver } from '../../bitcoin/addressDeriver';
import { configs } from '../../configs';
import * as ConfigTypes from '../../types/configs';
import { DbService } from '../dbService';
import { ScannerService } from '../scannerService';
import { TokenMapService } from '../tokenMapService';
import { registerBridgeableRoute } from './bridgeableRoute';
import { registerDonationRoute } from './donationRoute';

export class ApiService extends AbstractService {
  name = 'ApiService';
  private static instance?: ApiService;
  private fastify?: FastifyWithZod;
  private addressDeriver: AddressDeriver;

  private constructor(
    private apiConfig: ConfigTypes.Api,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.addressDeriver = new AddressDeriver(configs.bitcoin);
  }

  /**
   * Initialitypeses the singleton instance of ApiService
   */
  static init = (apiConfig: ConfigTypes.Api, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new ApiService(apiConfig, logger);
  };

  /**
   * Returns the singleton instance of ApiService
   */
  static getInstance = (): ApiService => {
    if (!this.instance) {
      throw new Error('ApiService instance is not initialitypesed yet');
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
    {
      serviceName: TokenMapService.name,
      allowedStatuses: [ServiceStatus.running],
    },
  ];

  /**
   * Starts the service: initialitypeses Fastify with Swagger and starts the server
   */
  protected start = async (): Promise<boolean> => {
    try {
      this.setStatus(ServiceStatus.started);
      this.fastify = await makeFastify(
        {
          path: '/swagger',
          title: 'Ergo Raffle API',
          description: 'API for Ergo Raffle operations',
          version: packageJson.version,
        },
        { logger: true },
      );

      // Register routes
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

  /**
   * Stops the service: closes the Fastify server
   */
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

  /**
   * Registers all API routes with their schemas
   */
  private registerRoutes = async (): Promise<void> => {
    if (!this.fastify) return;
    registerDonationRoute(
      this.fastify,
      this.logger.child('donationRoute'),
      this.addressDeriver,
      ScannerService.getInstance().addDynamicAddress,
      configs.donation.fee,
      configs.captcha,
    );
    registerBridgeableRoute(this.fastify);
  };
}
