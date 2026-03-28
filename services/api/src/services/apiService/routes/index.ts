import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { registerInfoRoute } from './info';

const registerAllRoutes = (fastify: FastifyWithZod, logger: AbstractLogger) => {
  registerInfoRoute(fastify);
  logger.debug('All routes are registered');
};

export { registerAllRoutes };
