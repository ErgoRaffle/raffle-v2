import { DataSource } from '@rosen-bridge/extended-typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { WinnerBoxInterface } from '../interfaces/types';
import { WinnerEntity } from '../entities/winner';
import { pick } from 'lodash-es';

export class WinnerAction extends AbstractInitializableErgoExtractorAction<
  WinnerBoxInterface,
  WinnerEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, WinnerEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: WinnerBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<WinnerEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        index: box.index,
        rewardPercent: box.rewardPercent,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (entities: WinnerEntity[]): WinnerBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'index',
        'rewardPercent',
      ]),
    );
  };
}
