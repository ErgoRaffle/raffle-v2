import { types } from '@rosen-bridge/fastify-enhanced';

// Response schema for all API endpoints
export const responseSchema = types.object({
  success: types.boolean(),
  message: types.string(),
});

// Donation request schema
export const donationRequestSchema = types.object({
  ticketCount: types.number().positive().describe('Number of tickets to buy'),
  raffleId: types.string().min(1).describe('Raffle Id to donate to'),
  donatorAddress: types.string().min(1).describe('Donator address'),
});

// Donation response data schema
export const donationResponseDataSchema = types.object({
  requiredNanoErgs: types.string(),
  requiredTokenId: types.string().optional(),
  requiredTokenCount: types.string().optional(),
  proxyAddress: types.string(),
});

// Donation full response schema - extends base responseSchema
export const donationResponseSchema = responseSchema.extend({
  data: donationResponseDataSchema,
});

// Creation request schema
export const creationRequestSchema = types.object({
  name: types.string().min(1).describe('Raffle name'),
  description: types.string().describe('Raffle description'),
  ticketPrice: types.string().describe('Ticket price'),
  goal: types.string().describe('Raffle goal amount'),
  winnersPercent: types
    .number()
    .positive()
    .describe('Winners share percentage'),
  implementorAddress: types.string().min(1).describe('Implementor address'),
  creatorAddress: types.string().min(1).describe('Creator address'),
  pictures: types
    .array(
      types.object({
        content: types.string().describe('Picture content'),
        orderIndex: types.number().describe('Picture order index'),
      }),
    )
    .describe('Raffle pictures'),
  winnerCount: types.number().positive().describe('Number of winners'),
  winnersShare: types.array(types.number()).describe('Winners share'),
  deadline: types.number().positive().describe('Deadline in blocks'),
  collectingTokenId: types
    .string()
    .optional()
    .describe('Collecting token ID for token-goal raffles'),
});

// Creation response data schema
export const creationResponseDataSchema = types.object({
  requiredNanoErgs: types.string(),
  requiredTokenId: types.string().optional(),
  proxyAddress: types.string(),
});

// Creation full response schema - extends base responseSchema
export const creationResponseSchema = responseSchema.extend({
  data: creationResponseDataSchema,
});

// Add Gift request schema
export const addGiftRequestSchema = types.object({
  raffleId: types.string().min(1).describe('Raffle ID to add gift to'),
  winnerIndex: types
    .number()
    .positive()
    .describe('Winner index to add gift to'),
  giftGiverAddress: types.string().min(1).describe('Gift giver address'),
});

// Add Gift response data schema
export const addGiftResponseDataSchema = types.object({
  proxyAddress: types.string(),
  requiredNanoErgs: types.string(),
});

// Add Gift full response schema - extends base responseSchema
export const addGiftResponseSchema = responseSchema.extend({
  data: addGiftResponseDataSchema,
});
