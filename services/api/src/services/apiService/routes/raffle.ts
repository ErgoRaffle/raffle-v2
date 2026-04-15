import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { RaffleStatus, RaffleOrder, RaffleView } from '@ergo-raffle/db-views';
import {
  ERG_TOKEN_DECIMALS,
  ERG_TOKEN_ID,
  ERG_TOKEN_NAME,
} from '@ergo-raffle/utils';

import { DbService } from '../../dbService';
import {
  errorResponseSchema,
  getRafflesQuerySchema,
  getRafflesResponseSchema,
  raffleDetailsSchema,
  raffleSearchParamScheme,
} from '../schema';

const getRaffleViewToElement = (raffle: RaffleView) => {
  const pictures = raffle.pictures.split(',');
  const picture = pictures.length > 0 ? pictures[0] : undefined;
  const token = raffle.collectingTokenId
    ? {
        id: raffle.collectingTokenId,
        name: raffle.tokenName ?? undefined,
        decimals: raffle.tokenDecimals ?? 0,
        verified: raffle.tokenIsVerified ?? false,
      }
    : {
        id: ERG_TOKEN_ID,
        name: ERG_TOKEN_NAME,
        decimals: ERG_TOKEN_DECIMALS,
        verified: true,
      };
  return {
    id: raffle.raffleId,
    name: raffle.name,
    description: raffle.description,
    image: picture,
    token: token,
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
};
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
      const items = raffles.map((raffle) => getRaffleViewToElement(raffle));
      response.status(200).send({ items: items, total: total });
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
      console.log('we are here');
      const { raffleId } = request.params as { raffleId: string };
      const raffle = await DbService.getInstance()
        .getRaffleViewAction()
        .getRaffle(raffleId);
      if (raffle) {
        const responseJson = {
          ...getRaffleViewToElement(raffle),
          addresses: {
            project: raffle.projectErgoTree,
            implementer: raffle.implementerErgoTree,
            service: raffle.serviceErgoTree,
          },
          share: {
            winner: raffle.winnersPercent,
            service: raffle.serviceFeePercent,
            implementer: raffle.implementerFeePercent,
          },
          baker: Number(raffle.bakers),
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
};

export { registerRaffleRoutes };
