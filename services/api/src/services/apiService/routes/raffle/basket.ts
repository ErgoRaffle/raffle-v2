import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import {
  transformErgoTreeToAddress,
  winnersViewToScheme,
} from '../../../../utils';
import { DbService } from '../../../dbService';
import {
  getRaffleWinnersQuerySchema,
  raffleSearchParamScheme,
  winnerApiResponseSchema,
  getActivitiesResponseSchema,
  basketTransactionsQueryParamSchema,
  basketTransactionParams,
} from '../../schema';

/**
 * Registers the GET /raffle/:raffleId/basket route
 * @param fastify - Fastify instance with Zod integration
 */
export const registerGetBasketRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/raffle/:raffleId/basket',
    {
      schema: {
        description: 'Returns a list of baskets on specified raffle',
        tags: ['Raffle'],
        params: raffleSearchParamScheme,
        querystring: getRaffleWinnersQuerySchema,
        response: {
          200: winnerApiResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { raffleId } = request.params as { raffleId: string };
      const [winners, total] = await DbService.getInstance()
        .getWinnerViewAction()
        .getWinners({
          raffleId,
          ...request.query,
        });
      const items = winnersViewToScheme(winners);
      response.status(200).send({ items, total });
    },
  );
};

/**
 * Registers the GET /raffle/:raffleId/basket/:index/transactions route.
 *
 * Returns a paginated list of activities (transactions) related to the
 * specified raffle and winner index.
 *
 * @param fastify - Fastify instance with Zod integration
 */
export const registerBasketWinnerRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/raffle/:raffleId/basket/:winnerIndex/transactions',
    {
      schema: {
        description: 'Transaction for specific winner',
        tags: ['Raffle'],
        params: basketTransactionParams,
        querystring: basketTransactionsQueryParamSchema,
        response: {
          200: getActivitiesResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { raffleId, winnerIndex } = request.params;
      const { offset, limit } = request.query;

      const result = await DbService.getInstance()
        .getActivityViewAction()
        .getActivities({
          query: { raffleId, winnerIndex },
          offset,
          limit,
        });
      response.status(200).send({
        total: result.total,
        items: result.items.map((item) => ({
          ...item,
          address: transformErgoTreeToAddress(item.ergoTree),
          /* TODO: Implement status for activities local/ergo/ergoraffle/raffle-v2/-/issues/150 */
          status: 'success',
        })),
      });
    },
  );
};
