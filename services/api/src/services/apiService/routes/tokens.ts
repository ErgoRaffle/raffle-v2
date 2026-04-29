import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { DbService } from '../../dbService';
import { getTokensQuerySchema, getTokensResponseSchema } from '../schema';

/**
 * Registers the GET /tokens route which returns token information
 * @param fastify - Fastify instance with Zod integration
 */
const registerGetTokensRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/tokens',
    {
      schema: {
        description: 'Returns token information for given token IDs',
        tags: ['Token'],
        querystring: getTokensQuerySchema,
        response: {
          200: getTokensResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { tokenIds } = request.query;
      const items = await DbService.getInstance()
        .getTokenAction()
        .getTokens(tokenIds);
      response.send({ items });
    },
  );
};

/**
 * Registers all token-related routes on the given Fastify instance
 * @param fastify - Fastify instance with Zod schema support
 */
const registerTokenRoutes = (fastify: FastifyWithZod) => {
  registerGetTokensRoute(fastify);
};

export { registerTokenRoutes };
