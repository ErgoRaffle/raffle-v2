import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { WinnerEntity } from '../entities';
import { WinnerBoxInterface } from '../interfaces/types';

export class WinnerAction extends AbstractErgoBoxAction<
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
        identifier: box.identifier,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        index: box.index,
        txFee: box.txFee,
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
        'identifier',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'index',
        'txFee',
        'rewardPercent',
      ]),
    );
  };
}
