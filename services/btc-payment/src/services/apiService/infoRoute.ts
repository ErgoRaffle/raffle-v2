import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import packageJson from '../../../package.json' with { type: 'json' };
import { configs } from '../../configs';
import { infoResponseSchema } from '../../types';

/**
 * Registers the GET /info route which returns captcha site key
 * @param fastify - Fastify instance with Zod integration
 */
export const registerInfoRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/info',
    {
      schema: {
        description: 'Returns captcha site key for frontend',
        tags: ['Info'],
        response: {
          200: infoResponseSchema,
        },
      },
    },
    async () => {
      return {
        siteKey: configs.captcha.siteKey ?? '',
        version: packageJson.version,
      };
    },
  );
};
