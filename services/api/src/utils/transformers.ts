import { RaffleView } from '@ergo-raffle/db-views';
import {
  ERG_TOKEN_DECIMALS,
  ERG_TOKEN_ID,
  ERG_TOKEN_NAME,
} from '@ergo-raffle/utils';

/**
 * Transforms a RaffleView object to an API response format
 * Handles token information (defaults to ERG if no collectingTokenId)
 * and calculates derived fields like winnersCount and raised amount
 * @param raffle - RaffleView object to transform
 * @returns API response object with formatted raffle data
 */
export const transformRaffleViewToApiResponse = (raffle: RaffleView) => {
  const token = raffle.collectingTokenId
    ? {
        id: raffle.collectingTokenId,
        name: raffle.tokenName ?? undefined,
        decimals: raffle.tokenDecimals ?? 0,
        verified: raffle.tokenIsVerified ?? false,
      }
    : {
        id: ERG_TOKEN_ID,
        name: ERG_TOKEN_NAME,
        decimals: ERG_TOKEN_DECIMALS,
        verified: true,
      };
  return {
    id: raffle.raffleId,
    name: raffle.name,
    description: raffle.description,
    token: token,
    winnersCount: raffle.winnersPercentList.split(',').length,
    giftCount: raffle.giftCount,
    deadline: raffle.deadline,
    amount: {
      goal: raffle.goal,
      raised: raffle.ticketPrice * raffle.soldTicketCount,
    },
    tags: raffle.tags.split(',').filter(Boolean),
    ticketPrice: raffle.ticketPrice,
    status: raffle.status(),
  };
};
