import { RaffleView, WinnerView } from '@ergo-raffle/db-views';

import { WinnerGift } from '../../src/types/winners';

const createBaseRaffle = (): RaffleView => {
  const raffle = new RaffleView();
  raffle.raffleId = 'raffle1';
  raffle.name = 'Test Raffle';
  raffle.description = 'Test description';
  raffle.winnersPercentList = '50,50';
  raffle.giftCount = 2;
  raffle.deadline = 1234567890;
  raffle.goal = 1000000000n;
  raffle.ticketPrice = 1000000n;
  raffle.soldTicketCount = 100n;
  raffle.tags = ',tech,';
  raffle.successCount = 0;
  raffle.redeemCount = 0;
  return raffle;
};

export const validErgoTree =
  '1005040004000e36100203a184f400027d1f79365a18179d525b2844483759d047d656d1a060004d803d1edcc70100';

export const mockRaffleWithCustomToken = createBaseRaffle();
mockRaffleWithCustomToken.collectingTokenId = 'token123';
mockRaffleWithCustomToken.tokenName = 'Test Token';
mockRaffleWithCustomToken.tokenDecimals = 9;
mockRaffleWithCustomToken.tokenIsVerified = true;
mockRaffleWithCustomToken.tags = ',tech,blockchain,';

export const mockRaffleWithErgToken = createBaseRaffle();

export const mockRaffleWithUndefinedTokenFields = createBaseRaffle();
mockRaffleWithUndefinedTokenFields.collectingTokenId = 'token123';

export const mockRaffleWithNullSoldTicketCount = createBaseRaffle();
mockRaffleWithNullSoldTicketCount.collectingTokenId = 'token123';
mockRaffleWithNullSoldTicketCount.soldTicketCount = null;

export const mockWinners: WinnerView[] = [
  { index: 0, rewardPercent: 50, serialized: undefined, raffleId: 'raffle1' },
  { index: 1, rewardPercent: 50, serialized: undefined, raffleId: 'raffle1' },
];

export const mockWinnersWithDuplicateIndices: WinnerView[] = [
  { index: 0, rewardPercent: 50, serialized: undefined, raffleId: 'raffle1' },
  { index: 0, rewardPercent: 50, serialized: undefined, raffleId: 'raffle1' },
];

export const mockAssetsWithDuplicates: WinnerGift[] = [
  { tokenId: 'token1', amount: 100n },
  { tokenId: 'token2', amount: 200n },
  { tokenId: 'token1', amount: 50n },
];

export const mockAssetsWithUniqueTokenIds: WinnerGift[] = [
  { tokenId: 'token1', amount: 100n },
  { tokenId: 'token2', amount: 200n },
  { tokenId: 'token3', amount: 300n },
];

export const mockSingleAsset: WinnerGift[] = [
  { tokenId: 'token1', amount: 100n },
];
