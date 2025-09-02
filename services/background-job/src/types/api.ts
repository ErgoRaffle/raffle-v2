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

// Active Raffle data schema
export const activeRaffleDataSchema = types.object({
  raffleId: types.string().describe('Raffle ID'),
  name: types.string().describe('Raffle name'),
  description: types.string().describe('Raffle description'),
  ticketPrice: types.string().describe('Ticket price in nanoERG'),
  goal: types.string().describe('Raffle goal amount in nanoERG'),
  deadline: types.number().describe('Deadline in blocks'),
  winnersCount: types.number().describe('Number of winners'),
  totalSoldTickets: types.string().describe('Total tickets sold'),
  winnersPercent: types.string().describe('Winners percentage in thousandths'),
  winnersPercentList: types
    .string()
    .describe('Comma-separated list of winner percentages'),
  serviceFeePercent: types
    .string()
    .describe('Service fee percentage in thousandths'),
  implementerFeePercent: types
    .string()
    .describe('Implementer fee percentage in thousandths'),
  collectingTokenId: types
    .string()
    .optional()
    .describe('Collecting token ID for token-goal raffles'),
  collectingTokenCount: types
    .string()
    .optional()
    .describe('Collecting token count'),
  totalRaised: types
    .string()
    .describe('Total amount raised (ticketPrice * totalSoldTickets)'),
  txId: types.string().describe('Transaction ID'),
});

// Active Raffles response schema - extends base responseSchema
export const activeRafflesResponseSchema = responseSchema.extend({
  data: types.array(activeRaffleDataSchema),
});

// Raffle Tickets request schema
export const raffleTicketsRequestSchema = types.object({
  raffleId: types.string().min(1).describe('Raffle ID to get tickets for'),
});

// Raffle Ticket data schema
export const raffleTicketDataSchema = types.object({
  txId: types.string().describe('Transaction ID'),
  raffleId: types.string().describe('Raffle ID'),
  donatorErgoTree: types.string().describe('Donator Ergo tree address'),
  ticketCount: types.number().describe('Number of tickets in this range'),
  rangeStart: types.string().describe('Ticket range start (as string)'),
  rangeEnd: types.string().describe('Ticket range end (as string)'),
});

// Raffle Tickets response schema - extends base responseSchema
export const raffleTicketsResponseSchema = responseSchema.extend({
  data: types.array(raffleTicketDataSchema),
});

// Raffle Gifts request schema
export const raffleGiftsRequestSchema = types.object({
  raffleId: types.string().min(1).describe('Raffle ID to get gifts for'),
});

// Raffle Gift data schema
export const raffleGiftDataSchema = types.object({
  txId: types.string().describe('Transaction ID'),
  raffleId: types.string().describe('Raffle ID'),
  donatorErgoTree: types.string().describe('Donator Ergo tree address'),
  winnerIndex: types.number().describe('Winner index this gift is for'),
});

// Raffle Gifts response schema - extends base responseSchema
export const raffleGiftsResponseSchema = responseSchema.extend({
  data: types.array(raffleGiftDataSchema),
});

// Success Raffle data schema
export const successRaffleDataSchema = types.object({
  raffleId: types.string().describe('Raffle ID'),
  txId: types.string().describe('Transaction ID'),
  selectedWinnersList: types
    .string()
    .describe('Comma-separated list of selected winner indices'),
  step: types.number().describe('Current step in the success raffle process'),
  totalSoldTickets: types.string().describe('Total number of tickets sold'),
  winnerCount: types.number().describe('Number of winners'),
  goal: types.string().describe('Raffle goal amount in nanoERG'),
  winnersPercentList: types
    .string()
    .describe('Comma-separated list of winner percentages'),
  height: types
    .number()
    .describe('Block height when the success raffle was created'),
});

// Success Raffles response schema - extends base responseSchema
export const successRafflesResponseSchema = responseSchema.extend({
  data: types.array(successRaffleDataSchema),
});

// Failed Raffle data schema
export const failedRaffleDataSchema = types.object({
  raffleId: types.string().describe('Raffle ID'),
  txId: types.string().describe('Transaction ID'),
  name: types.string().describe('Raffle name'),
  description: types.string().describe('Raffle description'),
  ticketPrice: types.string().describe('Ticket price in nanoERG'),
  goal: types.string().describe('Raffle goal amount in nanoERG'),
  deadline: types.number().describe('Deadline in blocks'),
  winnersPercent: types.number().describe('Winners percentage in thousandths'),
  winnersPercentList: types
    .string()
    .describe('Comma-separated list of winner percentages'),
  totalSoldTickets: types.string().describe('Total number of tickets sold'),
  winnersCount: types.number().describe('Number of winners'),
  collectingTokenId: types
    .string()
    .optional()
    .describe('Collecting token ID for token-goal raffles'),
});

// Failed Raffles response schema - extends base responseSchema
export const failedRafflesResponseSchema = responseSchema.extend({
  data: types.array(failedRaffleDataSchema),
});
