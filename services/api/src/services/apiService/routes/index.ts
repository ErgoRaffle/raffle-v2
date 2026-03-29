import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { registerInfoRoutes } from './info';

const registerAllRoutes = (fastify: FastifyWithZod, logger: AbstractLogger) => {
  registerInfoRoutes(fastify);
  logger.debug('All routes are registered');
};

export { registerAllRoutes };
