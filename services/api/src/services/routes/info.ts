import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';
import { z } from 'zod';

import packageJson from '../../../package.json' with { type: 'json' };
import { DbService } from '../dbService';

const infoResponseSchema = z.object({
  version: z.string(),
  fee: z.object({
    tx: z.bigint(),
    service: z.number(),
    implementer: z.number(),
    creation: z.bigint(),
  }),
  height: z.number(),
});

const errorResponseSchema = z.object({
  message: z.string(),
});

/**
 * Registers the GET /info route
 * @param fastify - Fastify instance
 */
export const registerInfoRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/info',
    {
      schema: {
        description: 'Returns service information',
        tags: ['Info'],
        response: {
          200: infoResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const lastService = await DbService.getInstance()
        .getServiceAction()
        .getLastService();
      const lastHeight = await DbService.getInstance()
        .getBlockAction()
        .getLastScannedHeight();
      if (lastService) {
        return reply.status(200).send({
          version: packageJson.version,
          height: lastHeight,
          fee: {
            tx: lastService.txFee,
            service: lastService.serviceFeePercent / 10,
            implementer: lastService.implementerFeePercent / 10,
            creation: lastService.creationFee,
          },
        });
      }
      return reply
        .status(500)
        .send({ message: 'Can not determine which service box is available' });
    },
  );
};
