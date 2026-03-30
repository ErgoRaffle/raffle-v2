import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

export const registerHealthRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/api/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['Health'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({ status: 'ok' });
    },
  );
};
