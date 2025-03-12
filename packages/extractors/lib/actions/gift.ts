import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { GiftBoxInterface } from '../interfaces/types';
import { GiftEntity } from '../entities/gift';

export class GiftAction extends AbstractInitializableErgoExtractorAction<
  GiftBoxInterface,
  GiftEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, GiftEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: GiftBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<GiftEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        donatorErgoTree: box.donatorErgoTree,
        winnerIndex: box.winnerIndex,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   */
  convertEntityToData = (entities: GiftEntity[]): GiftBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
      donatorErgoTree: data.donatorErgoTree,
      winnerIndex: data.winnerIndex,
    }));
  };
}
