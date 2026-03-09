import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { AddressDeriver } from '../../bitcoin/addressDeriver';
import { donationRequestSchema, donationResponseSchema } from '../../types/api';
import { DbService } from '../dbService';

// TODO: Add captcha verification
// local/ergo/ergoraffle/raffle-v2/-/issues/125
export const registerDonationRoute = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  addressDeriver: AddressDeriver,
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

        const lastDonationParamsId =
          await DbService.getInstance().getLastDonationParamsId();
        const bitcoinAddress =
          await addressDeriver.deriveAddress(lastDonationParamsId);

        // Save donation params to database
        const savedDonationParams =
          await DbService.getInstance().saveDonationParams({
            raffleId,
            ticketCount,
            donatorAddress,
            bitcoinAddress,
          });

        return {
          success: true,
          message: 'Donation request received',
          data: {
            requiredTokenId: savedDonationParams.tokenId?.toString(),
            requiredTokenCount: savedDonationParams.tokenAmount?.toString(),
            bitcoinAddress,
          },
        };
      } catch (error) {
        logger.error(`Donation error: ${error}`);
        throw new Error('Internal server error');
      }
    },
  );
};
