import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { DynamicBoxEntity } from '../entities';
import { DynamicBoxInterface } from '../interfaces/types';

export class DynamicBoxAction extends AbstractInitializableErgoExtractorAction<
  DynamicBoxInterface,
  DynamicBoxEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, DynamicBoxEntity, logger);
  }

  /**
   * create the dynamic box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: DynamicBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<DynamicBoxEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        address: box.address,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: DynamicBoxEntity[],
  ): DynamicBoxInterface[] => {
    return entities.map((data) =>
      pick(data, ['boxId', 'txId', 'address', 'extractor', 'serialized']),
    );
  };
}
