import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { RaffleDetailsEntity } from '../entities';
import { RaffleDetailsBoxInterface } from '../interfaces/types';

export class RaffleDetailsAction extends AbstractErgoBoxAction<
  RaffleDetailsBoxInterface,
  RaffleDetailsEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, RaffleDetailsEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes extracted boxes
   * @param block block metadata
   * @param extractor extractor name
   * @returns mapped entities for database insert/update
   */
  createEntity = (
    boxes: RaffleDetailsBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<RaffleDetailsEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        identifier: box.identifier,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        name: box.name,
        description: box.description,
        tags: box.tags,
        pictures: box.pictures,
      };
    });
  };

  /**
   * convert database entity back to extracted box format
   * @param entities stored entities
   * @returns converted extractor data objects
   */
  convertEntityToData = (
    entities: RaffleDetailsEntity[],
  ): RaffleDetailsBoxInterface[] => {
    return entities.map((data) => {
      return {
        identifier: data.identifier,
        txId: data.txId,
        raffleId: data.raffleId,
        extractor: data.extractor,
        serialized: data.serialized,
        name: data.name,
        description: data.description,
        tags: data.tags,
        pictures: data.pictures,
      };
    });
  };
}
