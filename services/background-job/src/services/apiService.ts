import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import { makeFastify, FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import { compile } from '@fleet-sdk/compiler';
import { ErgoAddress, Network } from '@fleet-sdk/core';

import { DbService } from './dbService';
import { RaffleBoxType } from '@ergo-raffle/extractors';
import * as ConfigTypes from '../types/configs';
import packageJson from '../../package.json' assert { type: 'json' };
import {
  donationRequestSchema,
  donationResponseSchema,
  creationRequestSchema,
  creationResponseSchema,
  addGiftRequestSchema,
  addGiftResponseSchema,
  activeRafflesResponseSchema,
  raffleTicketsRequestSchema,
  raffleTicketsResponseSchema,
  raffleGiftsRequestSchema,
  raffleGiftsResponseSchema,
  successRafflesResponseSchema,
  failedRafflesResponseSchema,
} from '../types/api';
import { CreationService } from './transactions/creationService';
import { DonationService } from './transactions/donationService';
import { AddGiftService } from './transactions/addGiftService';
import { configs } from '../config';
import {
  ActiveRaffleBuilder,
  SuccessRaffleBuilder,
  GiftRedeemBuilder,
} from '@ergo-raffle/boxes';
import { convertDbBoxesToErgoBoxes } from '../transactions/utils';

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
      this.fastify = await makeFastify(
        {
          path: this.apiConfig.swaggerPath,
          title: this.apiConfig.title,
          description: this.apiConfig.description,
          version: packageJson.version,
        },
        { logger: true },
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

    // Get Active Raffles route
    this.fastify.get(
      '/api/active-raffles',
      {
        schema: {
          description: 'Get all active raffle data with details',
          tags: ['Active Raffles'],
          response: {
            200: activeRafflesResponseSchema,
          },
        },
      },
      async () => {
        try {
          this.logger.info('Active raffles data requested');

          // Get all active raffle boxes
          const activeRaffleBoxes =
            await DbService.getInstance().getRaffleBoxes(
              undefined,
              RaffleBoxType.ActiveRaffle,
              true,
            );

          const activeRafflesData = [];

          for (const raffleBox of activeRaffleBoxes) {
            try {
              // Get raffle details for name, description, and pictures
              const raffleDetails =
                await DbService.getInstance().getRaffleDetailsBox(
                  raffleBox.raffleId,
                );

              // Get raffle data for additional information
              const inactiveRaffleData =
                await DbService.getInstance().getRaffleData(raffleBox.raffleId);

              const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(
                convertDbBoxesToErgoBoxes([raffleBox])[0],
              );
              const raffleData = {
                raffleId: raffleBox.raffleId,
                name: raffleDetails?.name || 'Unknown',
                description: raffleDetails?.description || 'No description',
                ticketPrice: activeRaffleBuilder.getTicketPrice().toString(),
                goal: activeRaffleBuilder.getGoal().toString(),
                deadline: Number(activeRaffleBuilder.getDeadline()),
                winnersCount: activeRaffleBuilder.getWinnersCount(),
                totalSoldTickets: activeRaffleBuilder
                  .getTotalSoldTickets()
                  .toString(),
                winnersPercent: activeRaffleBuilder
                  .getWinnersPercent()
                  .toString(),
                winnersPercentList:
                  inactiveRaffleData?.winnersPercentList || '',
                serviceFeePercent: activeRaffleBuilder
                  .getServiceFeePercent()
                  .toString(),
                implementerFeePercent: activeRaffleBuilder
                  .getImplementerFeePercent()
                  .toString(),
                collectingTokenId: activeRaffleBuilder.getCollectingTokenId(),
                collectingTokenCount: activeRaffleBuilder
                  .getCollectingTokenCount()
                  ?.toString(),
                totalRaised: (
                  activeRaffleBuilder.getTicketPrice() *
                  activeRaffleBuilder.getTotalSoldTickets()
                ).toString(),
                txId: raffleBox.txId,
              };

              activeRafflesData.push(raffleData);
            } catch (error) {
              this.logger.error(
                `Error processing raffle ${raffleBox.raffleId}: ${error}`,
              );
              // Continue with other raffles even if one fails
            }
          }

          return {
            success: true,
            message: 'Active raffles data retrieved successfully',
            data: activeRafflesData,
          };
        } catch (error) {
          this.logger.error(`Get active raffles error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );

    // Get Raffle Tickets route
    this.fastify.get(
      '/api/tickets/:raffleId',
      {
        schema: {
          description: 'Get all tickets for a specific raffle',
          tags: ['Raffle Tickets'],
          params: raffleTicketsRequestSchema,
          response: {
            200: raffleTicketsResponseSchema,
          },
        },
      },
      async (request) => {
        try {
          const { raffleId } = request.params as { raffleId: string };

          this.logger.info(`Raffle tickets requested for raffle: ${raffleId}`);

          // Get all tickets for the specified raffle
          const tickets = await DbService.getInstance().getTickets(raffleId);

          // Transform the data to match the schema
          const ticketsData = tickets.map((ticket) => ({
            txId: ticket.txId,
            raffleId: ticket.raffleId,
            donatorErgoTree: ticket.donatorErgoTree,
            rangeStart: ticket.rangeStart.toString(),
            rangeEnd: ticket.rangeEnd.toString(),
            ticketCount: Number(ticket.rangeEnd - ticket.rangeStart),
          }));

          return {
            success: true,
            message: 'Raffle tickets retrieved successfully',
            data: ticketsData,
          };
        } catch (error) {
          this.logger.error(`Get raffle tickets error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );

    // Get Raffle Gifts route
    this.fastify.get(
      '/api/gifts/:raffleId',
      {
        schema: {
          description: 'Get all gifts for a specific raffle',
          tags: ['Raffle Gifts'],
          params: raffleGiftsRequestSchema,
          response: {
            200: raffleGiftsResponseSchema,
          },
        },
      },
      async (request) => {
        try {
          const { raffleId } = request.params as { raffleId: string };

          this.logger.info(`Raffle gifts requested for raffle: ${raffleId}`);

          // Get all gifts for the specified raffle
          const gifts = await DbService.getInstance().getGifts(raffleId);

          // Transform the data to match the schema
          const giftsData = gifts.map((gift) => ({
            txId: gift.txId,
            raffleId: gift.raffleId,
            donatorErgoTree: gift.donatorErgoTree,
            winnerIndex: gift.winnerIndex,
          }));

          return {
            success: true,
            message: 'Raffle gifts retrieved successfully',
            data: giftsData,
          };
        } catch (error) {
          this.logger.error(`Get raffle gifts error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );

    // Get Success Raffles route
    this.fastify.get(
      '/api/success-raffles',
      {
        schema: {
          description: 'Get all success raffles sorted by newer to older',
          tags: ['Success Raffles'],
          response: {
            200: successRafflesResponseSchema,
          },
        },
      },
      async () => {
        try {
          this.logger.info('Success raffles data requested');

          // Get all success raffle boxes (including spent ones) and deduplicate by raffleId
          const successRaffleBoxes =
            await DbService.getInstance().getAllSuccessRaffleBoxes();

          const successRafflesData = [];

          for (const successRaffleBox of successRaffleBoxes) {
            try {
              // Get raffle data for additional information
              const inactiveRaffleData =
                await DbService.getInstance().getRaffleData(
                  successRaffleBox.raffleId,
                );

              // Create SuccessRaffleBuilder from the box data to extract parameters
              const successRaffleBuilder = SuccessRaffleBuilder.fromBox(
                convertDbBoxesToErgoBoxes([successRaffleBox])[0],
              );

              const raffleData = {
                raffleId: successRaffleBox.raffleId,
                txId: successRaffleBox.txId,
                selectedWinnersList: successRaffleBox.selectedWinnersList,
                step: successRaffleBox.step,
                totalSoldTickets: successRaffleBuilder
                  .getTotalSoldTickets()
                  .toString(),
                winnerCount: successRaffleBuilder.getWinnerCount(),
                goal: inactiveRaffleData?.goal?.toString() || '0',
                winnersPercentList:
                  inactiveRaffleData?.winnersPercentList || '',
                height: successRaffleBox.height || 0,
              };

              successRafflesData.push(raffleData);
            } catch (error) {
              this.logger.error(
                `Error processing success raffle ${successRaffleBox.raffleId}: ${error}`,
              );
              // Continue with other raffles even if one fails
            }
          }

          return {
            success: true,
            message: 'Success raffles data retrieved successfully',
            data: successRafflesData,
          };
        } catch (error) {
          this.logger.error(`Get success raffles error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );

    // Get Failed Raffles route
    this.fastify.get(
      '/api/failed-raffles',
      {
        schema: {
          description: 'Get all failed raffles sorted by newer to older',
          tags: ['Failed Raffles'],
          response: {
            200: failedRafflesResponseSchema,
          },
        },
      },
      async () => {
        try {
          this.logger.info('Failed raffles data requested');

          // Get all gift redeem boxes (including spent ones) and deduplicate by raffleId
          const giftRedeemBoxes =
            await DbService.getInstance().getAllGiftRedeemBoxes();

          const failedRafflesData = [];

          for (const giftRedeemBox of giftRedeemBoxes) {
            try {
              // Get raffle data for additional information
              const raffleData = await DbService.getInstance().getRaffleData(
                giftRedeemBox.raffleId,
              );

              // Get raffle details for name and description
              const raffleDetails =
                await DbService.getInstance().getRaffleDetailsBox(
                  giftRedeemBox.raffleId,
                  false,
                );

              // Create GiftRedeemBuilder from the box data to extract parameters
              const giftRedeemBuilder = GiftRedeemBuilder.fromBox(
                convertDbBoxesToErgoBoxes([giftRedeemBox])[0],
              );

              const failedRaffleData = {
                raffleId: giftRedeemBox.raffleId,
                txId: giftRedeemBox.txId,
                name: raffleDetails?.name || 'Unknown',
                description: raffleDetails?.description || 'No description',
                ticketPrice: raffleData?.ticketPrice?.toString() || '0',
                goal: raffleData?.goal?.toString() || '0',
                deadline: Number(raffleData?.deadline || 0),
                winnersPercent: Number(raffleData?.winnersPercent || 0),
                winnersPercentList: raffleData?.winnersPercentList || '',
                totalSoldTickets:
                  giftRedeemBuilder.getTotalSoldTickets()?.toString() || '0',
                winnersCount: Number(giftRedeemBuilder.getWinnersCount() || 0),
                collectingTokenId: raffleData?.collectingTokenId || undefined,
              };

              failedRafflesData.push(failedRaffleData);
            } catch (error) {
              this.logger.error(
                `Error processing failed raffle ${giftRedeemBox.raffleId}: ${error}`,
              );
              // Continue with other raffles even if one fails
            }
          }

          return {
            success: true,
            message: 'Failed raffles data retrieved successfully',
            data: failedRafflesData,
          };
        } catch (error) {
          this.logger.error(`Get failed raffles error: ${error}`);
          throw new Error('Internal server error');
        }
      },
    );
  };
}
