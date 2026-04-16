import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { RaffleOrder } from '@ergo-raffle/db-views';
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
      const raffleResult = await DbService.getInstance()
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
      const items = raffleResult.items.map((raffle) => {
        const pictures = raffle.pictures.split(',');
        // TODO must fix after local/ergo/ergoraffle/raffle-v2/-/issues/135
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
          status: raffle.status(),
        };
      });
      response.status(200).send({ items, total: raffleResult.total });
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
