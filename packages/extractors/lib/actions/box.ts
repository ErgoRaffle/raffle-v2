import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { BoxInterface } from '../interfaces/types';
import { BoxEntity } from '../entities';
import { pick } from 'lodash-es';

export class BoxAction extends AbstractInitializableErgoExtractorAction<
  BoxInterface,
  BoxEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, BoxEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: BoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<BoxEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (entities: BoxEntity[]): BoxInterface[] => {
    return entities.map((data) =>
      pick(data, ['boxId', 'txId', 'raffleId', 'extractor', 'serialized']),
    );
  };
}
