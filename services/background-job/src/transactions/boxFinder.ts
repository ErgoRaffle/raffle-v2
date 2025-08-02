import { WinnerBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ErgoBox } from '@fleet-sdk/core';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { DbService } from '../services/dbService';
import { convertDbBoxesToErgoBoxes } from './utils';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

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
      box.ergoTree === raffleInfo.addresses.winner &&
      box.assets[0].tokenId === raffleId,
  );
  const winnerBox = winnerBoxes.find((box) => {
    const winnerBoxBuilder = WinnerBuilder.fromBox(box);
    return winnerBoxBuilder.getWinnerIndex() === winnerIndex;
  });
  if (winnerBox) {
    return winnerBox;
  }
  logger.debug(
    `The related winner box not found, searching database for winner box`,
  );
  const winnerBoxEntity = await DbService.getInstance().getWinnerBox(
    raffleId,
    winnerIndex,
  );
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
