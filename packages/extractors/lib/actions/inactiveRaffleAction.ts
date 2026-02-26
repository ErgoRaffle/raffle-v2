import { AbstractErgoBoxAction } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';
import { pick } from 'lodash-es';

import { InactiveRaffleEntity } from '../entities';
import { InactiveRaffleBoxInterface } from '../interfaces/types';

export class InactiveRaffleAction extends AbstractErgoBoxAction<
  InactiveRaffleBoxInterface,
  InactiveRaffleEntity
> {
  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, InactiveRaffleEntity, logger);
  }

  /**
   * create the database entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: InactiveRaffleBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<InactiveRaffleEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        identifier: box.identifier,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        serviceErgoTree: box.serviceErgoTree,
        implementorErgoTree: box.implementorErgoTree,
        creatorErgoTree: box.creatorErgoTree,
        serviceFeePercent: box.serviceFeePercent,
        implementerFeePercent: box.implementerFeePercent,
        winnersPercent: box.winnersPercent,
        ticketPrice: box.ticketPrice,
        goal: box.goal,
        deadline: box.deadline,
        winnersPercentList: box.winnersPercentList,
        txFee: box.txFee,
        collectingTokenId: box.collectingTokenId,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: InactiveRaffleEntity[],
  ): InactiveRaffleBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'identifier',
        'block',
        'height',
        'serialized',
        'extractor',
        'txId',
        'raffleId',
        'serviceErgoTree',
        'implementorErgoTree',
        'creatorErgoTree',
        'serviceFeePercent',
        'implementerFeePercent',
        'winnersPercent',
        'ticketPrice',
        'goal',
        'deadline',
        'winnersPercentList',
        'txFee',
        'collectingTokenId',
      ]),
    );
  };
}
