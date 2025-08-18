import { DataSource } from '@rosen-bridge/extended-typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { TicketBoxInterface } from '../interfaces/types';
import { TicketEntity } from '../entities/ticket';
import { pick } from 'lodash-es';

export class TicketAction extends AbstractInitializableErgoExtractorAction<
  TicketBoxInterface,
  TicketEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, TicketEntity, logger);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: TicketBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<TicketEntity, 'id'>[] => {
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
        rangeStart: box.rangeStart,
        rangeEnd: box.rangeEnd,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (entities: TicketEntity[]): TicketBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'donatorErgoTree',
        'rangeStart',
        'rangeEnd',
      ]),
    );
  };
}
