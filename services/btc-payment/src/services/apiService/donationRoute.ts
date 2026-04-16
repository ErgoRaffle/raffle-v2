import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { ERG_TOKEN_ID } from '@ergo-raffle/utils';

import { AddressDeriver } from '../../bitcoin/addressDeriver';
import { BTC_TOKEN_ID } from '../../constants';
import { ERGO_CHAIN_NAME } from '../../constants';
import {
  Captcha as CaptchaConfig,
  donationRequestSchema,
  donationResponseSchema,
} from '../../types';
import { DbService } from '../dbService';
import { TokenMapService } from '../tokenMapService';

/**
 * Verifies a captcha token using the configured captcha provider endpoint.
 *
 * @param captchaToken - Token received from client-side captcha widget.
 * @param captcha - Captcha config with `secret` and `url` for verification.
 * @param logger - Route logger used for error/diagnostic logs.
 * @returns True if token is successfully verified; otherwise false.
 */
const verifyCaptchaToken = async (
  captchaToken: string,
  captcha: CaptchaConfig,
  logger: AbstractLogger,
): Promise<boolean> => {
  const secret = captcha.secret!.trim();
  const payload = new URLSearchParams({
    secret,
    response: captchaToken,
  });

  const response = await fetch(captcha.url!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    logger.warn(`Captcha verification failed with status ${response.status}`);
    return false;
  }
  const verificationResult: { success?: boolean } = await response.json();
  return verificationResult.success === true;
};

/**
 * Registers POST /api/donation with captcha verification and donation handling.
 *
 * @param fastify - Fastify instance with Zod schemas.
 * @param logger - Logger for the route.
 * @param addressDeriver - Derives Bitcoin addresses for donations.
 * @param addWatchingAddress - Registers an address for chain scanning.
 * @param tokenMapService - Resolves BTC token mapping for the raffle.
 * @param donationFee - Additional fee in satoshi included in the donation response.
 * @param captcha - Captcha provider `secret` and verification endpoint `url`.
 */
export const registerDonationRoute = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  addressDeriver: AddressDeriver,
  addWatchingAddress: (address: string, tokenId: string) => void,
  tokenMapService: TokenMapService,
  donationFee: bigint,
  captcha: CaptchaConfig,
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
        const { ticketCount, raffleId, donatorAddress, captchaToken } =
          request.body;

        if (captcha.enabled) {
          if (!captchaToken) {
            return {
              success: false,
              message: 'Captcha token is required',
              data: {},
            };
          }

          const captchaVerified = await verifyCaptchaToken(
            captchaToken,
            captcha,
            logger,
          );
          if (!captchaVerified) {
            return {
              success: false,
              message: 'Captcha verification failed',
              data: {},
            };
          }
          logger.info('Captcha verified successfully');
        }

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
        const wrappedTokenAmount = tokenMapService
          .getTokenMap()
          .wrapAmount(
            raffleData.collectingTokenId || ERG_TOKEN_ID,
            tokenAmount,
            ERGO_CHAIN_NAME,
          ).amount;
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
          btcTokenId === BTC_TOKEN_ID
            ? wrappedTokenAmount + donationFee
            : wrappedTokenAmount,
          btcTokenId,
        );
        await addWatchingAddress(bitcoinAddress, savedDonationParams.tokenId);

        const donationData =
          btcTokenId === BTC_TOKEN_ID
            ? {
                satoshiAmount: (wrappedTokenAmount + donationFee).toString(),
                bitcoinAddress,
              }
            : {
                tokenAmount: wrappedTokenAmount.toString(),
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
