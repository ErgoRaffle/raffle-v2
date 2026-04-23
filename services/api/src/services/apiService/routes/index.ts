import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { registerActivityRoutes } from './activity';
import { registerInfoRoutes } from './info';
import { registerRaffleRoutes } from './raffle';

const registerAllRoutes = (fastify: FastifyWithZod, logger: AbstractLogger) => {
  registerInfoRoutes(fastify);
  registerRaffleRoutes(fastify);
  registerActivityRoutes(fastify);
  logger.debug('All routes are registered');
};

export { registerAllRoutes };
