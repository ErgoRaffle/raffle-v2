import { z } from 'zod';

import { DEFAULT_API_PAGE_SIZE } from '../../const';
import { RaffleStatus } from '../../types';

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
  verified: z.boolean(),
});

const raffleAmountSchema = z.object({
  goal: z.coerce.bigint(),
  raised: z.coerce.bigint(),
});

const raffleItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  image: z.string().optional(),
  token: tokenSchema,
  winnersCount: z.number(),
  giftCount: z.number(),
  tags: z.array(z.string()).optional(),
  deadline: z.number(),
  amount: raffleAmountSchema,
  ticketPrice: z.coerce.bigint(),
  trust: z.number(),
  status: raffleStatusSchema,
});

const getRafflesQuerySchema = z.object({
  // text: z.string().optional(),
  // tokenId: z.array(z.string()).optional(),
  // tags: z.array(z.string()).optional(),
  // status: z.array(raffleStatusSchema).optional(),
  // ids: z.array(z.string()).optional(),
  offset: z.string().optional().default('0'),
  limit: z.string().optional().default(DEFAULT_API_PAGE_SIZE.toString()),
});

const getRafflesResponseSchema = z.object({
  items: z.array(raffleItemSchema),
  total: z.number(),
});

export {
  blockchainInfoResponseSchema,
  versionResponseSchema,
  errorResponseSchema,
  getRafflesQuerySchema,
  getRafflesResponseSchema,
};
