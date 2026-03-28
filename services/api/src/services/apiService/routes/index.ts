import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { registerHealthRoute } from './health';

const registerAllRoutes = (fastify: FastifyWithZod, logger: AbstractLogger) => {
  registerHealthRoute(fastify);
  logger.debug('All routes are registered');
};

export { registerAllRoutes };
