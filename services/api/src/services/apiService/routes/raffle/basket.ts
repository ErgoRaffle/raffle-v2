import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { winnersViewToScheme } from '../../../../utils';
import { DbService } from '../../../dbService';
import {
  getRaffleWinnersQuerySchema,
  raffleSearchParamScheme,
  winnerApiResponseSchema,
} from '../../schema';

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
