import { ErgoAddress, Network } from '@fleet-sdk/core';
import { deserializeBox } from '@fleet-sdk/serializer';

import { raffleInfo } from '@ergo-raffle/contracts';
import { RaffleView, WinnerView } from '@ergo-raffle/db-views';
import {
  ERG_TOKEN_DECIMALS,
  ERG_TOKEN_ID,
  ERG_TOKEN_NAME,
} from '@ergo-raffle/utils';

import { configs } from '../configs';
import { Winner, WinnerGift } from '../types/winners';

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
        isVerified: !!raffle.tokenIsVerified,
      }
    : {
        id: ERG_TOKEN_ID,
        name: ERG_TOKEN_NAME,
        decimals: ERG_TOKEN_DECIMALS,
        isVerified: true,
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
      raised: raffle.ticketPrice * (raffle.soldTicketCount ?? 0n),
    },
    tags: raffle.tags.split(',').filter(Boolean),
    ticketPrice: raffle.ticketPrice,
    status: raffle.status(),
  };
};

/**
 * Transforms an ErgoTree hex string to a human-readable Ergo address
 * Converts the hex string to a buffer, creates an ErgoAddress from it,
 * and formats it for the appropriate network (Mainnet or Testnet)
 * @param ergoTree - ErgoTree as a hex string
 * @returns Ergo address string formatted for the current network
 */
export const transformErgoTreeToAddress = (ergoTree: string) => {
  return ErgoAddress.fromErgoTree(Buffer.from(ergoTree, 'hex')).toString(
    raffleInfo.network === 'Mainnet' ? Network.Mainnet : Network.Testnet,
  );
};

export const winnersViewToScheme = (
  winners: Array<WinnerView>,
): Array<Winner> => {
  const winnersMap = new Map<number, Winner>();
  winners.forEach((winner) => {
    const winnerObject = winnersMap.get(winner?.index ?? 0) ?? {
      index: winner.index,
      share: winner.rewardPercent,
      gifts: [],
    };
    if (winner.giftSerialized) {
      const box = deserializeBox(Buffer.from(winner.giftSerialized, 'base64'));
      winnerObject.gifts.push(...box.assets.slice(1));
      if (box.value > 3n * winner.txFee) {
        winnerObject.gifts.push({
          tokenId: ERG_TOKEN_ID,
          amount: box.value - 3n * winner.txFee,
        });
      }
    }
    winnersMap.set(winner.index, winnerObject);
  });
  return winnersMap
    .values()
    .map((winner) => {
      return {
        index: winner.index,
        share: winner.share,
        gifts: mergeAssets(winner.gifts),
      };
    })
    .toArray();
};

export const mergeAssets = (assets: Array<WinnerGift>): Array<WinnerGift> => {
  const assetsMap = new Map<string, bigint>();
  assets.forEach((asset) => {
    assetsMap.set(
      asset.tokenId,
      (assetsMap.get(asset.tokenId) ?? 0n) + asset.amount,
    );
  });
  return Array.from(assetsMap.entries()).map(([tokenId, amount]) => ({
    tokenId,
    amount,
  }));
};

export const transformCIDToURL = (cid: string) => {
  return configs.ipfs.urlTransformSchema.replace('{CID}', cid);
};
