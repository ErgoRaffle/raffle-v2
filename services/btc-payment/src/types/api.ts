import { z as types } from 'zod';

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
  captchaToken: types
    .string()
    .min(1)
    .optional()
    .describe('Captcha token when captcha validation is enabled'),
});

// Donation response data schema
export const donationResponseDataSchema = types.object({
  bitcoinAddress: types.string().optional(),
  satoshiAmount: types.string().optional(),
  tokenId: types.string().optional(),
  tokenAmount: types.string().optional(),
});

// Donation full response schema - extends base responseSchema
export const donationResponseSchema = responseSchema.extend({
  data: donationResponseDataSchema,
});
