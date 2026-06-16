import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { DbService } from '../../../dbService';
import {
  getSocialQuerySchema,
  getSocialResponseSchema,
  raffleSearchParamScheme,
} from '../../schema';

/**
 * Registers the GET /raffle/:raffleId/social route.
 *
 * Returns the X.com posts the poller has stored for a raffle (non-hidden, newest first,
 * offset/limit paginated). Each item carries the canonical tweet URL so the frontend can embed it;
 * tweet bodies are intentionally not stored or returned (fetched live by the embed).
 *
 * @param fastify - Fastify instance with Zod integration
 */
export const registerGetSocialRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/raffle/:raffleId/social',
    {
      schema: {
        description: 'Returns X.com posts about the specified raffle',
        tags: ['Raffle'],
        params: raffleSearchParamScheme,
        querystring: getSocialQuerySchema,
        response: {
          200: getSocialResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { raffleId } = request.params as { raffleId: string };
      const { offset, limit } = request.query;
      const { items, total } = await DbService.getInstance()
        .getSocialAction()
        .listByRaffle(raffleId, offset, limit);
      response.status(200).send({
        items: items.map((post) => ({
          tweetId: post.tweetId,
          authorHandle: post.authorHandle,
          createdAt: new Date(post.createdAtMs).toISOString(),
          url: `https://x.com/${post.authorHandle}/status/${post.tweetId}`,
        })),
        total,
      });
    },
  );
};
