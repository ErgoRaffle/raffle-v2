import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { GiftBoxInterface } from '../interfaces/types';
import { Gift } from '../entities/gift';

export class GiftAction extends AbstractInitializableErgoExtractorAction<
  GiftBoxInterface,
  Gift
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<Gift>;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, Gift, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(Gift);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: GiftBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<Gift, 'id'>[] => {
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
        winnerIndex: box.winnerIndex,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   */
  convertEntityToData = (entities: Gift[]): GiftBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
      donatorErgoTree: data.donatorErgoTree,
      winnerIndex: data.winnerIndex,
    }));
  };
}
