import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { DbService } from '../../dbService';
import {
  getTokensQuerySchema,
  getTokensResponseSchema,
  searchTokensQuerySchema,
  searchTokensResponseSchema,
} from '../schema';

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
 * Registers the GET /tokens/search route which returns token information
 * @param fastify - Fastify instance with Zod integration
 */
const registerTokensSearchRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/tokens/search',
    {
      schema: {
        description: 'Returns token information for given query',
        tags: ['Token'],
        querystring: searchTokensQuerySchema,
        response: {
          200: searchTokensResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { query, offset, limit } = request.query;
      const [items, total] = await DbService.getInstance()
        .getTokenAction()
        .searchTokens(query, offset, limit);
      response.send({ items, total });
    },
  );
};

/**
 * Registers all token-related routes on the given Fastify instance
 * @param fastify - Fastify instance with Zod schema support
 */
const registerTokenRoutes = (fastify: FastifyWithZod) => {
  registerGetTokensRoute(fastify);
  registerTokensSearchRoute(fastify);
};

export { registerTokenRoutes };
