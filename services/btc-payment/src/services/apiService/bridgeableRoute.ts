import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { BITCOIN_RUNES_CHAIN_NAME, ERGO_CHAIN_NAME } from '../../constants';
import { bridgeableQuerySchema, bridgeableResponseSchema } from '../../types';
import { TokenMapService } from '../tokenMapService';

/**
 * Registers the GET /tokens/bridgeable route which checks if a token is bridgeable
 * @param fastify - Fastify instance with Zod integration
 */
export const registerBridgeableRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/tokens/bridgeable',
    {
      schema: {
        description: 'Checks if a token is bridgeable',
        tags: ['Token'],
        querystring: bridgeableQuerySchema,
        response: {
          200: bridgeableResponseSchema,
        },
      },
    },
    async (request) => {
      const { tokenId } = request.query;
      const result = TokenMapService.getInstance()
        .getTokenMap()
        .search(ERGO_CHAIN_NAME, { tokenId });
      return {
        tokenId,
        bridgeable:
          result.length > 0 &&
          Object.keys(result[0]).includes(BITCOIN_RUNES_CHAIN_NAME),
      };
    },
  );
};
