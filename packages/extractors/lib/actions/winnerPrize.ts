import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { WinnerPrizeBoxInterface } from '../interfaces/types';
import { WinnerPrizeEntity } from '../entities/';
import { pick } from 'lodash-es';

export class WinnerPrizeAction extends AbstractInitializableErgoExtractorAction<
  WinnerPrizeBoxInterface,
  WinnerPrizeEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, WinnerPrizeEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: WinnerPrizeBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<WinnerPrizeEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        winnerTicketIndex: box.winnerTicketIndex,
        giftCount: box.giftCount,
        winnerIndex: box.winnerIndex,
        unwrappedGiftCount: box.unwrappedGiftCount,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: WinnerPrizeEntity[],
  ): WinnerPrizeBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'winnerTicketIndex',
        'giftCount',
        'winnerIndex',
        'unwrappedGiftCount',
      ]),
    );
  };
}
