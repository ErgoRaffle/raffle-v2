import { WinnerBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ErgoBox, ErgoAddress } from '@fleet-sdk/core';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { RaffleBoxType } from '@ergo-raffle/extractors';

import { DbService } from '../services/dbService';
import { convertDbBoxesToErgoBoxes } from './utils';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

/**
 * Find all winner boxes for a raffle
 * @param unspentBoxes - The unspent boxes
 * @param raffleId - The raffle id
 * @returns The winner box
 */
export const findAllWinners = async (
  unspentBoxes: ErgoBox[],
  raffleId: string,
): Promise<ErgoBox[]> => {
  logger.debug(`Searching winner boxes for raffle [${raffleId}]`);
  const winnerBoxes = unspentBoxes.filter(
    (box) =>
      box.ergoTree ===
        ErgoAddress.fromBase58(raffleInfo.addresses.winner).ergoTree &&
      box.assets[0].tokenId === raffleId,
  );
  logger.debug(
    `Found ${winnerBoxes.length} unspent winner boxes in unspent boxes for raffle [${raffleId}] with boxIds: ${winnerBoxes.map((box) => box.boxId).join(', ')}`,
  );

  // Search the database for winner boxes that are not in the unspent boxes
  const winnerBoxEntities = (
    await DbService.getInstance().getWinnerBoxes(raffleId)
  ).filter((dbBox) => {
    return !winnerBoxes.some((box) => box.boxId === dbBox.boxId);
  });

  logger.debug(
    `Found ${winnerBoxEntities.length} winner boxes in the database for raffle [${raffleId}] with boxIds: ${winnerBoxEntities.map((box) => box.boxId).join(', ')}`,
  );
  // Sort the winner boxes by winner index
  return winnerBoxes.concat(convertDbBoxesToErgoBoxes(winnerBoxEntities));
};

/**
 * Find the winner box for a raffle by its index
 * @param unspentBoxes - The unspent boxes
 * @param raffleId - The raffle id
 * @param winnerIndex - The winner index
 * @returns The winner box
 */
export const findWinner = async (
  unspentBoxes: ErgoBox[],
  raffleId: string,
  winnerIndex: number,
): Promise<ErgoBox | undefined> => {
  logger.debug(
    `Searching winner box for raffle [${raffleId}] and winner index [${winnerIndex}]`,
  );
  const winnerBoxes = unspentBoxes.filter(
    (box) =>
      box.ergoTree ===
        ErgoAddress.fromBase58(raffleInfo.addresses.winner).ergoTree &&
      box.assets[0].tokenId === raffleId,
  );
  const winnerBox = winnerBoxes.find((box) => {
    const winnerBoxBuilder = WinnerBuilder.fromBox(box);
    logger.debug(
      `winner index of ${box.boxId}: ${JSON.stringify(winnerBoxBuilder.getWinnerIndex())}`,
    );
    return winnerBoxBuilder.getWinnerIndex() === winnerIndex;
  });
  if (winnerBox) {
    return winnerBox;
  }
  logger.debug(
    `The related winner box not found, searching database for winner box`,
  );
  const winnerBoxEntity = (
    await DbService.getInstance().getWinnerBoxes(raffleId, winnerIndex)
  )[0];
  if (!winnerBoxEntity) {
    logger.warn(
      `Winner box not found for raffle [${raffleId}] and winner index [${winnerIndex}]`,
    );
    return undefined;
  }
  return convertDbBoxesToErgoBoxes([winnerBoxEntity])[0];
};

/**
 * Find the service box for a raffle
 * @param unspentBoxes - The unspent boxes
 * @returns The service box
 */
export const findServiceBox = async (
  unspentBoxes: ErgoBox[],
): Promise<ErgoBox | undefined> => {
  // Find the service box in unspent boxes
  let serviceBox = unspentBoxes.find(
    (box) => box.assets[0]?.tokenId === raffleInfo.tokens.serviceNft,
  );
  if (serviceBox) {
    return serviceBox;
  }
  // Find the service box in the database
  logger.debug(`Service box not found, trying to find in the database`);
  const serviceBoxEntity = await DbService.getInstance().getServiceBox();
  if (!serviceBoxEntity) {
    logger.error(`Service box not found in database`);
    return undefined;
  }
  return convertDbBoxesToErgoBoxes([serviceBoxEntity])[0];
};

/**
 * Find the active raffle box for a raffle
 * @param unspentBoxes - The unspent boxes
 * @param raffleId - The raffle id
 * @returns The active raffle box
 */
export const findActiveRaffle = async (
  unspentBoxes: ErgoBox[],
  raffleId: string,
): Promise<ErgoBox | undefined> => {
  // Find the active raffle box in unspent boxes
  let box = unspentBoxes.find(
    (box) =>
      box.assets[0]?.tokenId === raffleInfo.tokens.raffleLicense &&
      box.assets[1]?.tokenId === raffleId,
  );
  if (box) {
    return box;
  }
  // Find the active raffle box in the database
  logger.debug(
    `Active raffle box for raffle [${raffleId}] not found in unspent boxes, trying to search the database`,
  );
  const boxEntities = await DbService.getInstance().getRaffleBoxes(
    raffleId,
    RaffleBoxType.ActiveRaffle,
  );
  if (!boxEntities || boxEntities.length === 0) {
    logger.error(
      `Active raffle box for raffle [${raffleId}] not found in database`,
    );
    return undefined;
  }
  return convertDbBoxesToErgoBoxes(boxEntities)[0];
};

/**
 * Find the gift redeem box for a raffle
 * @param unspentBoxes - The unspent boxes (optional)
 * @param raffleId - The raffle id
 * @returns The gift redeem box
 */
export const findGiftRedeemBox = async (
  unspentBoxes: ErgoBox[] = [],
  raffleId: string,
): Promise<ErgoBox | undefined> => {
  // Find the gift redeem box in unspent boxes
  let box = unspentBoxes.find(
    (box) =>
      box.ergoTree ===
        ErgoAddress.fromBase58(raffleInfo.addresses.giftRedeem).ergoTree &&
      box.assets[1]?.tokenId === raffleId,
  );
  if (box) {
    return box;
  }
  // Find the gift redeem box in the database
  logger.debug(
    `Gift redeem box for raffle [${raffleId}] not found in unspent boxes, trying to search the database`,
  );
  const boxEntities =
    await DbService.getInstance().getGiftRedeemBoxes(raffleId);
  if (!boxEntities || boxEntities.length === 0) {
    logger.error(
      `Gift redeem box for raffle [${raffleId}] not found in database`,
    );
    return undefined;
  }
  return convertDbBoxesToErgoBoxes(boxEntities)[0];
};
