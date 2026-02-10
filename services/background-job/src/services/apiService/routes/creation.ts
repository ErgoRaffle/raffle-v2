import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import {
  creationRequestSchema,
  creationResponseSchema,
} from '../../../types/api';
import { DbService } from '../../dbService';
import { CreationService } from '../../transactions/creationService';

export const registerCreationRoute = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  generateProxyAddress: () => string,
) => {
  fastify.post(
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

        logger.info(
          `Raffle creation requested: ${name} - ${ticketPrice} nano erg per ticket, goal: ${goal}, winners: ${winnerCount}`,
        );

        const requiredNanoErgs = 1_000_000_000n;
        const proxyAddress = generateProxyAddress();
        logger.info(
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
        logger.error(`Creation error: ${error}`);
        throw new Error('Internal server error');
      }
    },
  );
};
