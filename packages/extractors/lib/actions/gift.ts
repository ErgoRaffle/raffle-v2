import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { GiftEntity } from '../entities';
import { GiftBoxInterface } from '../interfaces/types';

export class GiftAction extends AbstractErgoBoxAction<
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
        identifier: box.identifier,
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
      identifier: data.identifier,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
      donatorErgoTree: data.donatorErgoTree,
      winnerIndex: data.winnerIndex,
    }));
  };
}
