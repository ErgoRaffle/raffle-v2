import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { registerAddGiftRoute } from './addGift';
import { registerCreationRoute } from './creation';
import { registerDonationRoute } from './donation';

export const registerAllRoutes = (
  fastify: FastifyWithZod,
  logger: AbstractLogger,
  generateProxyAddress: () => string,
) => {
  registerCreationRoute(fastify, logger, generateProxyAddress);
  registerDonationRoute(fastify, logger, generateProxyAddress);
  registerAddGiftRoute(fastify, logger, generateProxyAddress);
};
