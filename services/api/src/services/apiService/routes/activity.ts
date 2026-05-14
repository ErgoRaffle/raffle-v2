import { ErgoAddress } from '@fleet-sdk/core';
import { FastifyWithZod } from '@rosen-bridge/fastify-enhanced';

import { transformErgoTreeToAddress } from '../../../utils';
import { DbService } from '../../dbService';
import {
  getActivitiesQuerySchema,
  getActivitiesResponseSchema,
} from '../schema';

const registerGetActivitiesRoute = (fastify: FastifyWithZod) => {
  fastify.get(
    '/activity',
    {
      schema: {
        description: 'Returns a paginated list of user activities',
        tags: ['Activity'],
        querystring: getActivitiesQuerySchema,
        response: {
          200: getActivitiesResponseSchema,
        },
      },
    },
    async (request, response) => {
      const { address, raffleId, types, offset, limit } = request.query;
      const ergoTree = address
        ? ErgoAddress.fromBase58(address).ergoTree
        : undefined;
      const result = await DbService.getInstance()
        .getActivityViewAction()
        .getActivities({
          query: { ergoTree, raffleId },
          types,
          offset,
          limit,
        });
      response.status(200).send({
        total: result.total,
        items: result.items.map((item) => ({
          ...item,
          address: transformErgoTreeToAddress(item.ergoTree),
          /* TODO: Implement status for activities local/ergo/ergoraffle/raffle-v2/-/issues/150 */
          status: 'success',
        })),
      });
    },
  );
};

const registerActivityRoutes = (fastify: FastifyWithZod) => {
  registerGetActivitiesRoute(fastify);
};

export { registerActivityRoutes };
