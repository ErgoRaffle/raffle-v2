import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { configs } from '../../../config';
import {
  addGiftRequestSchema,
  addGiftResponseSchema,
} from '../../../types/api';
import { DbService } from '../../dbService';
import { AddGiftService } from '../../transactions/addGiftService';

export const registerAddGiftRoute = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  generateProxyAddress: () => string,
) => {
  fastify.post(
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
        logger.info(
          `Gift addition requested for raffle ${raffleId} to winner ${winnerIndex} from ${giftGiverAddress}`,
        );
        const proxyAddress = generateProxyAddress();
        logger.info(`Proxy address generated for add gift: ${proxyAddress}`);

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
        logger.error(`Add gift error: ${error}`);
        throw new Error('Internal server error');
      }
    },
  );
};
