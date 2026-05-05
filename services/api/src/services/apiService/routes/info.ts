import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import packageJson from '../../../../package.json' with { type: 'json' };
import { ERGO_SCANNER_NAME } from '../../../const';
import { DbService } from '../../dbService';
import {
  blockchainInfoResponseSchema,
  errorResponseSchema,
  versionResponseSchema,
} from '../schema';

/**
 * Registers the GET /info/blockchain route which returns blockchain-related
 * service information including fee parameters and last scanned height
 * @param fastify - Fastify instance with Zod schema support
 */

const registerBlockchainInfoRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/info/blockchain',
    {
      schema: {
        description: 'Returns service blockchain related information',
        tags: ['Info'],
        response: {
          200: blockchainInfoResponseSchema,
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
        .getLastScannedHeight(ERGO_SCANNER_NAME);
      if (lastService) {
        return reply.status(200).send({
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

/**
 * Registers the GET /info/version route which returns the current service version
 * @param fastify - Fastify instance with Zod schema support
 */
const registerVersionRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/info/version',
    {
      schema: {
        description: 'Returns service version',
        tags: ['Info'],
        response: {
          200: versionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      return reply.status(200).send({
        version: packageJson.version,
      });
    },
  );
};

/**
 * Registers all info-related routes on the given Fastify instance
 * @param fastify - Fastify instance with Zod schema support
 */
const registerInfoRoutes = (fastify: FastifyWithZod) => {
  registerVersionRoute(fastify);
  registerBlockchainInfoRoute(fastify);
};

export { registerInfoRoutes };
