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
});

// Donation response data schema
export const donationResponseDataSchema = types.object({
  tokenAmount: types.string(),
  tokenId: types.string(),
  bitcoinAddress: types.string(),
});

// Donation full response schema - extends base responseSchema
export const donationResponseSchema = responseSchema.extend({
  data: donationResponseDataSchema,
});
