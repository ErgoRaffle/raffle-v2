import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { DbService } from '../../dbService';
import {
  getActivitiesQuerySchema,
  getActivitiesResponseSchema,
} from '../schema';

const registerGetActivitiesRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/activity',
    {
      schema: {
        description: 'Returns a paginated list of user activities',
        tags: ['Activity'],
        querystring: getActivitiesQuerySchema,
        response: {
          200: getActivitiesResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { address, raffleId, offset, limit } = request.query;
      const result = await DbService.getInstance()
        .getUserActivityViewAction()
        .getActivities({
          query: { address, raffleId },
          offset,
          limit,
        });
      response.status(200).send(result);
    },
  );
};

const registerActivityRoutes = (fastify: FastifyWithZod) => {
  registerGetActivitiesRoute(fastify);
};

export { registerActivityRoutes };
