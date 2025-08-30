import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { createFastify, FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import { compile } from '@fleet-sdk/compiler';
import { ErgoAddress, Network } from '@fleet-sdk/core';

import { DbService } from './dbService';
import * as ConfigTypes from '../types/configs';
import packageJson from '../../package.json' assert { type: 'json' };
import {
  donationRequestSchema,
  donationResponseSchema,
  creationRequestSchema,
  creationResponseSchema,
  addGiftRequestSchema,
  addGiftResponseSchema,
} from '../types/api';
import { CreationService } from './transactions/creationService';
import { DonationService } from './transactions/donationService';
import { AddGiftService } from './transactions/addGiftService';
import { configs } from '../config';

export class ApiService extends AbstractService {
  name = 'ApiService';
  private static instance?: ApiService;
  private fastify?: FastifyWithZod;
  private requestIndex = 0;

  private constructor(
    private apiConfig: ConfigTypes.Api,
    logger?: AbstractLogger,
  ) {
    super(logger);
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
  ];

  /**
   * Starts the service: initialitypeses Fastify with Swagger and starts the server
   */
  protected start = async (): Promise<boolean> => {
    try {
      this.fastify = await createFastify(
        {
          path: this.apiConfig.swaggerPath,
          title: this.apiConfig.title,
          description: this.apiConfig.description,
          version: packageJson.version,
        },
        { logger: false },
      );

      // Register routes
      await this.registerRoutes();

      await this.fastify.listen({
        port: this.apiConfig.port,
        host: 'localhost',
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

  private generateProxyAddress = (): string => {
    this.requestIndex++;
    return ErgoAddress.fromErgoTree(
      compile(`{sigmaProp(HEIGHT > ${this.requestIndex})}`).toHex().toString(),
    ).toString(Network.Testnet);
  };

  /**
   * Registers all API routes with their schemas
   */
  private registerRoutes = async (): Promise<void> => {
    if (!this.fastify) return;

    // Creation route
    this.fastify.post(
      '/api/creation',
      {
        schema: {
          description: 'Create a new raffle',
          tags: ['Creation'],
          body: creationRequestSchema,
          response: {
            200: creationResponseSchema,
          },
        },
      },
      async (request) => {
        try {
          const {
            name,
            description,
            ticketPrice,
            goal,
            winnersPercent,
            implementorAddress,
            creatorAddress,
            pictures,
            winnerCount,
            winnersShare,
            deadline,
            collectingTokenId,
          } = request.body;

          this.logger.info(
            `Raffle creation requested: ${name} - ${ticketPrice} nano erg per ticket, goal: ${goal}, winners: ${winnerCount}`,
          );

          const requiredNanoErgs = 1_000_000_000n;
          const proxyAddress = this.generateProxyAddress();
          this.logger.info(
            `Proxy address generated for creation request: ${proxyAddress}`,
          );

          const savedCreationParams =
            await DbService.getInstance().saveCreationParams(
              {
                name,
                description,
                ticketPrice: BigInt(ticketPrice),
                goal: BigInt(goal),
                winnersPercent,
                implementorAddress,
                creatorAddress,
                winnerCount,
                winnersPercentList: winnersShare.join(',').toString(),
                deadline,
                collectingTokenId,
                proxyAddress,
                requiredValue: BigInt(requiredNanoErgs),
              },
              pictures,
            );
          CreationService.getInstance().createRaffle(savedCreationParams);

          return {
            success: true,
            message: 'Raffle creation request received',
            data: {
              proxyAddress,
              requiredNanoErgs: requiredNanoErgs.toString(),
              requiredTokenId: collectingTokenId,
            },
          };
        } catch (error) {
          this.logger.error(`Creation error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );

    // Donation route
    this.fastify.post(
      '/api/donation',
      {
        schema: {
          description: 'Calculate required resources for buying raffle tickets',
          tags: ['Donation'],
          body: donationRequestSchema,
          response: {
            200: donationResponseSchema,
          },
        },
      },
      async (request) => {
        try {
          const { ticketCount, raffleId, donatorAddress } = request.body;

          this.logger.info(
            `Donation requested: ${ticketCount} tickets for raffle ${raffleId}`,
          );

          // Calculate required resources
          const proxyAddress = this.generateProxyAddress();
          this.logger.info(
            `Proxy address generated for donation: ${proxyAddress}`,
          );

          // Save donation params to database
          const savedDonationParams =
            await DbService.getInstance().saveDonationParams({
              raffleId,
              ticketCount,
              donatorAddress,
              proxyAddress,
            });

          // Register with donation service
          DonationService.getInstance().donate(savedDonationParams);

          return {
            success: true,
            message: 'Donation request received',
            data: {
              requiredNanoErgs: savedDonationParams.requiredValue.toString(),
              requiredTokenId:
                savedDonationParams.collectingTokenId?.toString(),
              requiredTokenCount:
                savedDonationParams.collectingTokenAmount?.toString(),
              proxyAddress,
            },
          };
        } catch (error) {
          this.logger.error(`Donation error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );

    // Add Gift route
    this.fastify.post(
      '/api/add-gift',
      {
        schema: {
          description: 'Add a gift to a specific winner in an existing raffle',
          tags: ['Add Gift'],
          body: addGiftRequestSchema,
          response: {
            200: addGiftResponseSchema,
          },
        },
      },
      async (request) => {
        try {
          const { raffleId, winnerIndex, giftGiverAddress } = request.body;
          const requiredNanoErgs = 3n * configs.ergo.fee;
          this.logger.info(
            `Gift addition requested for raffle ${raffleId} to winner ${winnerIndex} from ${giftGiverAddress}`,
          );
          const proxyAddress = this.generateProxyAddress();
          this.logger.info(
            `Proxy address generated for add gift: ${proxyAddress}`,
          );

          // Save add gift params to database
          const savedAddGiftParams =
            await DbService.getInstance().saveAddGiftParams({
              raffleId,
              winnerIndex,
              giftGiverAddress,
              proxyAddress,
            });

          // Register with add gift service
          AddGiftService.getInstance().addGift(savedAddGiftParams);

          return {
            success: true,
            message: 'Gift addition request received',
            data: {
              proxyAddress,
              requiredNanoErgs: requiredNanoErgs.toString(),
            },
          };
        } catch (error) {
          this.logger.error(`Add gift error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );
  };
}
