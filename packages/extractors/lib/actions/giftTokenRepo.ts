import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { GiftTokenRepoBoxInterface } from '../interfaces/types';
import { GiftTokenRepo } from '../entities/giftTokenRepo';

export class GiftTokenRepoAction extends AbstractInitializableErgoExtractorAction<
  GiftTokenRepoBoxInterface,
  GiftTokenRepo
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<GiftTokenRepo>;
  private readonly prefix = 'GiftTokenRepo';

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, GiftTokenRepo, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(GiftTokenRepo);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: GiftTokenRepoBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<GiftTokenRepo, 'id'>[] => {
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
   */
  convertEntityToData = (
    entities: GiftTokenRepo[],
  ): GiftTokenRepoBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
    }));
  };
}
