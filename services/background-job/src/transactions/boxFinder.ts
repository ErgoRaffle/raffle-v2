import { WinnerBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ErgoBox } from '@fleet-sdk/core';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import { DbService } from '../services/dbService';
import { convertDbBoxesToErgoBoxes } from './utils';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

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
