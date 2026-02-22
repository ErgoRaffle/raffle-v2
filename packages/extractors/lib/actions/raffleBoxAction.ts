import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { RaffleBoxEntity } from '../entities';
import { RaffleBoxInterface } from '../interfaces/types';

export class RaffleBoxAction extends AbstractErgoBoxAction<
  RaffleBoxInterface,
  RaffleBoxEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, RaffleBoxEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: RaffleBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<RaffleBoxEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        identifier: box.identifier,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        type: box.type,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (entities: RaffleBoxEntity[]): RaffleBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'identifier',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'type',
      ]),
    );
  };
}
