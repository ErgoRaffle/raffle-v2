import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { RaffleOrder } from '@ergo-raffle/db-views';

import {
  transformErgoTreeToAddress,
  transformRaffleViewToApiResponse,
} from '../../../../utils';
import { DbService } from '../../../dbService';
import {
  errorResponseSchema,
  getRafflesQuerySchema,
  getRafflesResponseSchema,
  raffleDetailsSchema,
  raffleSearchParamScheme,
} from '../../schema';
import { registerGetBasketRoute } from './basket';

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
        const pictures = JSON.parse(raffle.pictures);
        const picture = pictures.length > 0 ? pictures[0] : undefined;
        return { picture, ...transformRaffleViewToApiResponse(raffle) };
      });
      response.status(200).send({ items, total: raffleResult.total });
    },
  );
};

/**
 * Registers the GET /raffle/:raffleId route which returns a single raffle
 * @param fastify - Fastify instance with Zod schema support
 */
const registerGetRaffleRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/raffle/:raffleId',
    {
      schema: {
        description: 'Returns a single raffle by ID',
        tags: ['Raffle'],
        params: raffleSearchParamScheme,
        response: {
          404: errorResponseSchema,
          200: raffleDetailsSchema,
        },
      },
    },
    async (request, response) => {
      const { raffleId } = request.params as { raffleId: string };
      const raffle = await DbService.getInstance()
        .getRaffleViewAction()
        .getRaffle(raffleId);
      if (raffle) {
        const responseJson = {
          ...transformRaffleViewToApiResponse(raffle),
          pictures: JSON.parse(raffle.pictures),
          addresses: {
            project: transformErgoTreeToAddress(raffle.projectErgoTree),
            implementer: transformErgoTreeToAddress(raffle.implementerErgoTree),
            service: transformErgoTreeToAddress(raffle.serviceErgoTree),
          },
          share: {
            winner: raffle.winnersPercent,
            service: raffle.serviceFeePercent,
            implementer: raffle.implementerFeePercent,
          },
          backers: Number(raffle.backers),
        };
        return response.status(200).send(responseJson);
      }
      response.status(404).send({ message: 'raffle not found' });
    },
  );
};

/**
 * Registers all raffle-related routes on the given Fastify instance
 * @param fastify - Fastify instance with Zod schema support
 */
const registerRaffleRoutes = (fastify: FastifyWithZod) => {
  registerGetRafflesRoute(fastify);
  registerGetRaffleRoute(fastify);
  registerGetBasketRoute(fastify);
};

export { registerRaffleRoutes };
