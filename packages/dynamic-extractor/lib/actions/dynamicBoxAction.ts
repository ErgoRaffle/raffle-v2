import { AbstractErgoAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { DynamicBoxEntity } from '../entities';
import { DynamicBoxInterface } from '../interfaces/types';

export class DynamicBoxAction extends AbstractErgoAction<
  DynamicBoxInterface,
  DynamicBoxEntity
> {
  /**
   * @param dataSource - TypeORM data source
   * @param logger - Logger instance (optional)
   */
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, DynamicBoxEntity, logger);
  }

  /**
   * create the dynamic box entity from extracted data and block information
   * @param boxes - Extracted dynamic box data
   * @param block - Block info (hash, height)
   * @param extractor - Extractor id
   * @returns Array of entity objects (without id) ready for insert
   */
  createEntity = (
    boxes: DynamicBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<DynamicBoxEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        identifier: box.identifier,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        address: box.address,
        tokenId: box.tokenId,
        amount: box.amount,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities - Dynamic box entities from DB
   * @returns Array of dynamic box interface objects
   */
  convertEntityToData = (
    entities: DynamicBoxEntity[],
  ): DynamicBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'identifier',
        'txId',
        'address',
        'extractor',
        'serialized',
        'tokenId',
        'amount',
      ]),
    );
  };
}
