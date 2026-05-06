import { z } from 'zod';

import {
  RaffleStatus,
  USER_ACTIVITY_TYPES,
  InclusionStatus,
} from '@ergo-raffle/db-views';

import { DEFAULT_API_PAGE_SIZE, MAX_API_PAGE_SIZE } from '../../const';

const blockchainInfoResponseSchema = z.object({
  fee: z.object({
    tx: z.bigint(),
    service: z.number(),
    implementer: z.number(),
    creation: z.bigint(),
  }),
  height: z.number(),
});

const versionResponseSchema = z.object({
  version: z.string(),
});

const errorResponseSchema = z.object({
  message: z.string(),
});

const raffleStatusSchema = z.enum([
  RaffleStatus.Active,
  RaffleStatus.Failed,
  RaffleStatus.SuccessFull,
]);

const tokenSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  decimals: z.number().default(0),
  isVerified: z.boolean(),
});

const raffleAmountSchema = z.object({
  goal: z.bigint(),
  raised: z.bigint(),
});

const raffleItemSchemaObject = {
  id: z.string(),
  name: z.string(),
  description: z.string(),
  token: tokenSchema,
  winnersCount: z.number(),
  giftCount: z.number(),
  tags: z.array(z.string()).optional(),
  deadline: z.number(),
  amount: raffleAmountSchema,
  ticketPrice: z.bigint(),
  status: raffleStatusSchema,
};

const raffleItemSchema = z.object({
  ...raffleItemSchemaObject,
  picture: z.string().optional(),
});

const raffleAddressesSchema = z.object({
  project: z.string(),
  implementer: z.string(),
  service: z.string(),
});

const raffleShareSchema = z.object({
  winner: z.number(),
  implementer: z.number(),
  service: z.number(),
});
const raffleDetailsSchema = z.object({
  ...raffleItemSchemaObject,
  pictures: z.array(z.string()),
  addresses: raffleAddressesSchema,
  share: raffleShareSchema,
  backerCount: z.number(),
});

const getRafflesQuerySchema = z.object({
  text: z.string().optional(),
  tokenIds: z
    .union([z.array(z.string()), z.string().transform((item) => [item])])
    .optional(),
  tags: z
    .union([z.array(z.string()), z.string().transform((item) => [item])])
    .optional(),
  ids: z
    .union([z.array(z.string()), z.string().transform((item) => [item])])
    .optional(),
  status: z
    .union([
      z.array(raffleStatusSchema),
      raffleStatusSchema.transform((item) => [item]),
    ])
    .optional(),
  order: z.enum(['height', 'deadline']).optional().default('height'),
  direction: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce
    .number()
    .max(MAX_API_PAGE_SIZE)
    .optional()
    .default(DEFAULT_API_PAGE_SIZE),
});

const InclusionStatusScheme = z
  .enum([InclusionStatus.NonEmpty, InclusionStatus.Empty])
  .optional();

const getRaffleWinnersQuerySchema = z.object({
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce
    .number()
    .max(MAX_API_PAGE_SIZE)
    .optional()
    .default(DEFAULT_API_PAGE_SIZE),
  share: InclusionStatusScheme,
  gift: InclusionStatusScheme,
  index: z.coerce.number().optional(),
});

const paginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
  });

const getRafflesResponseSchema = paginatedSchema(raffleItemSchema);

const activityItemSchema = z.object({
  ergoTree: z.string(),
  raffleId: z.string(),
  type: z.enum(USER_ACTIVITY_TYPES),
  ticketCount: z.bigint().optional(),
  txId: z.string(),
  height: z.number(),
});

const getActivitiesQuerySchema = z.object({
  ergoTree: z.string().optional(),
  raffleId: z.string().optional(),
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce.number().optional().default(DEFAULT_API_PAGE_SIZE),
});

const getActivitiesResponseSchema = paginatedSchema(activityItemSchema);

const raffleSearchParamScheme = z.object({
  raffleId: z.string(),
});

const winnerGiftsSchema = z.object({
  tokenId: z.string(),
  amount: z.bigint(),
});

const winnerSchema = z.object({
  index: z.number(),
  share: z.number(),
  gifts: z.array(winnerGiftsSchema),
});

const winnerApiResponseSchema = z.object({
  items: z.array(winnerSchema),
  total: z.number(),
});

const getTokensQuerySchema = z.object({
  tokenIds: z.union([
    z.array(z.string()).max(100, 'Maximum 100 token IDs allowed'),
    z.string().transform((item) => [item]),
  ]),
});

const searchTokensQuerySchema = z.object({
  query: z.string().min(2, 'Minimum 2 character required'),
  offset: z.coerce.number().optional().default(0),
  limit: z.coerce
    .number()
    .max(MAX_API_PAGE_SIZE)
    .optional()
    .default(DEFAULT_API_PAGE_SIZE),
});

const getTokensResponseSchema = z.object({
  items: z.array(tokenSchema),
});

const searchTokensResponseSchema = z.object({
  items: z.array(tokenSchema),
  total: z.number(),
});

export {
  blockchainInfoResponseSchema,
  versionResponseSchema,
  errorResponseSchema,
  getRafflesQuerySchema,
  getRafflesResponseSchema,
  getActivitiesQuerySchema,
  getActivitiesResponseSchema,
  raffleDetailsSchema,
  raffleSearchParamScheme,
  winnerApiResponseSchema,
  getRaffleWinnersQuerySchema,
  getTokensQuerySchema,
  getTokensResponseSchema,
  searchTokensQuerySchema,
  searchTokensResponseSchema,
};
