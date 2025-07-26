import { DataSource } from 'typeorm';
import { pick } from 'lodash-es';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractorAction } from '@rosen-bridge/abstract-extractor';
import { BlockInfo } from '@rosen-bridge/scanner-interfaces';

import { InactiveRaffleBoxInterface } from '../interfaces/types';
import { InactiveRaffleEntity } from '../entities';

export class InactiveRaffleAction extends AbstractInitializableErgoExtractorAction<
  InactiveRaffleBoxInterface,
  InactiveRaffleEntity
> {
  private readonly prefix = 'InactiveRaffle';

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
        boxId: box.boxId,
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
        'boxId',
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
      ]),
    );
  };
}
