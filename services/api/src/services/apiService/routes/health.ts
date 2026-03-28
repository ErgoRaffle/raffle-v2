import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import { z } from 'zod';

const healthResponseSchema = z.object({
  message: z.string(),
});

export const registerHealthRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: healthResponseSchema,
        },
      },
    },
    async () => {
      return { message: 'OK' };
    },
  );
};
