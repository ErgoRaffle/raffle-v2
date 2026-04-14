import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { RaffleStatus, RaffleOrder } from '@ergo-raffle/db-views';
import { ERG_TOKEN_ID } from '@ergo-raffle/utils';

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
      const {
        limit,
        offset,
        text,
        tokenIds,
        ids,
        tags,
        status,
        order,
        direction,
      } = request.query;
      const orderDirection: RaffleOrder | undefined =
        order && direction ? { field: order, direction } : undefined;
      const [raffles, total] = await DbService.getInstance()
        .getRaffleViewAction()
        .getRaffles({
          query: {
            text,
            tokenIds: tokenIds,
            tags: tags,
            ids: ids,
            status: status,
          },
          order: orderDirection,
          offset,
          limit,
        });
      const items = raffles.map((raffle) => {
        const pictures = raffle.pictures.split(',');
        const picture = pictures.length > 0 ? pictures[0] : undefined;
        return {
          id: raffle.raffleId,
          name: raffle.name,
          description: raffle.description,
          image: picture,
          token: {
            id: raffle.collectingTokenId ?? ERG_TOKEN_ID,
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
          tags: raffle.tags.split(',').filter(Boolean),
          ticketPrice: raffle.ticketPrice,
          trust: 0,
          status:
            raffle.successCount > 0
              ? RaffleStatus.SuccessFull
              : raffle.redeemCount > 0
                ? RaffleStatus.Failed
                : RaffleStatus.Active,
        };
      });
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
