import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { RaffleStatus } from '@ergo-raffle/db-views';

import { toArrayOrUndefined } from '../../../../utils/utils';
import { DbService } from '../../dbService';
import { getRafflesQuerySchema, getRafflesResponseSchema } from '../schema';

/**
 * Registers the GET /raffle route which returns a list of raffles
 * @param fastify - Fastify instance with Zod schema support
 */
const registerGetRafflesRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/raffle',
    {
      schema: {
        description: 'Returns a list of raffles',
        tags: ['Raffle'],
        querystring: getRafflesQuerySchema,
        response: {
          200: getRafflesResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { limit, offset, text, tokenIds, ids, tags, status } =
        request.query;

      const [raffles, total] = await DbService.getInstance()
        .getRaffleViewAction()
        .getRaffles(
          {
            text,
            tokenIds: toArrayOrUndefined(tokenIds),
            tags: toArrayOrUndefined(tags),
            ids: toArrayOrUndefined(ids),
            status: toArrayOrUndefined(status),
          },
          {},
          offset,
          limit,
        );
      const items = raffles.map((raffle) => ({
        id: raffle.raffleId,
        name: raffle.name,
        description: raffle.description,
        token: {
          id: raffle.collectingTokenId ?? 'erg',
          name: 'Erg',
          decimals: 9,
          verified: true,
        },
        winnersCount: raffle.winnersPercentList.split(',').length,
        giftCount: raffle.giftCount,
        deadline: raffle.deadline,
        amount: {
          goal: raffle.goal,
          raised: raffle.ticketPrice * raffle.soldTicketCount,
        },
        tags: raffle.tags.split(','),
        ticketPrice: raffle.ticketPrice,
        trust: 0,
        status:
          raffle.successCount > 0
            ? RaffleStatus.SuccessFull
            : raffle.redeemCount > 0
              ? RaffleStatus.Failed
              : RaffleStatus.Active,
      }));
      response.status(200).send({ items: items, total: total });
    },
  );
};

/**
 * Registers all raffle-related routes on the given Fastify instance
 * @param fastify - Fastify instance with Zod schema support
 */
const registerRaffleRoutes = (fastify: FastifyWithZod) => {
  registerGetRafflesRoute(fastify);
};

export { registerRaffleRoutes };
