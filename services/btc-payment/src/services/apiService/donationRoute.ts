import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import { TokenMap } from '@rosen-bridge/tokens';

import { AddressDeriver } from '../../bitcoin/addressDeriver';
import { donationRequestSchema, donationResponseSchema } from '../../types/api';
import { DbService } from '../dbService';

// TODO: Add captcha verification
// local/ergo/ergoraffle/raffle-v2/-/issues/125
export const registerDonationRoute = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  addressDeriver: AddressDeriver,
  addWatchingAddress: (address: string, tokenId: string) => void,
  tokenMap: TokenMap,
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

        const donationAction = DbService.getInstance().getDonationAction();
        const lastDonationParamsId = await donationAction.getLastId();
        const bitcoinAddress =
          await addressDeriver.deriveAddress(lastDonationParamsId);

        const savedDonationParams = await donationAction.save(
          {
            raffleId,
            ticketCount,
            donatorAddress,
            bitcoinAddress,
          },
          tokenMap,
        );
        await addWatchingAddress(bitcoinAddress, savedDonationParams.tokenId);

        return {
          success: true,
          message: 'Donation request received',
          data: {
            requiredTokenId: savedDonationParams.tokenId.toString(),
            requiredTokenCount: savedDonationParams.tokenAmount.toString(),
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
