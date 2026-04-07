import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { AddressDeriver } from '../../bitcoin/addressDeriver';
import { BTC_TOKEN_ID, ERG_TOKEN_ID } from '../../constants';
import { donationRequestSchema, donationResponseSchema } from '../../types/api';
import { DbService } from '../dbService';
import { TokenMapService } from '../tokenMapService';

// TODO: Add captcha verification
// local/ergo/ergoraffle/raffle-v2/-/issues/125
export const registerDonationRoute = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  addressDeriver: AddressDeriver,
  addWatchingAddress: (address: string, tokenId: string) => void,
  tokenMapService: TokenMapService,
  donationFee: bigint,
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

        const raffleData = await DbService.getInstance()
          .getRaffleAction()
          .getData(raffleId);

        const tokenAmount = BigInt(ticketCount) * raffleData.ticketPrice;
        const btcTokenId = tokenMapService.getBtcTokenId(
          raffleData.collectingTokenId || ERG_TOKEN_ID,
        );

        const savedDonationParams = await donationAction.save(
          {
            raffleId,
            ticketCount,
            donatorAddress,
            bitcoinAddress,
          },
          tokenAmount,
          btcTokenId,
        );
        await addWatchingAddress(bitcoinAddress, savedDonationParams.tokenId);

        const donationData =
          btcTokenId === BTC_TOKEN_ID
            ? {
                satoshiAmount: (tokenAmount + donationFee).toString(),
                bitcoinAddress,
              }
            : {
                tokenAmount: tokenAmount.toString(),
                satoshiAmount: donationFee.toString(),
                tokenId: btcTokenId,
                bitcoinAddress,
              };

        return {
          success: true,
          message: 'Donation request received',
          data: donationData,
        };
      } catch (error) {
        logger.error(`Donation error: ${error}`);
        throw new Error('Internal server error');
      }
    },
  );
};
