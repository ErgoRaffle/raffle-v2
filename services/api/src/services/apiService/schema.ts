import { z } from 'zod';

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

export {
  blockchainInfoResponseSchema,
  versionResponseSchema,
  errorResponseSchema,
};
