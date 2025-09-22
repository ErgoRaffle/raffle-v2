import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import { DbService } from '../../dbService';
import { DonationService } from '../../transactions/donationService';
import {
  donationRequestSchema,
  donationResponseSchema,
} from '../../../types/api';

export const registerDonationRoute = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  generateProxyAddress: () => string,
) => {
  fastify.post(
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

        logger.info(
          `Donation requested: ${ticketCount} tickets for raffle ${raffleId}`,
        );

        // Calculate required resources
        const proxyAddress = generateProxyAddress();
        logger.info(`Proxy address generated for donation: ${proxyAddress}`);

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
            requiredTokenId: savedDonationParams.collectingTokenId?.toString(),
            requiredTokenCount:
              savedDonationParams.collectingTokenAmount?.toString(),
            proxyAddress,
          },
        };
      } catch (error) {
        logger.error(`Donation error: ${error}`);
        throw new Error('Internal server error');
      }
    },
  );
};
