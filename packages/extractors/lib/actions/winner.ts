import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { WinnerBoxInterface } from '../interfaces/types';
import { Winner } from '../entities/winner';

export class WinnerAction extends AbstractInitializableErgoExtractorAction<
  WinnerBoxInterface,
  Winner
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<Winner>;
  private readonly index: number;
  private readonly rewardPercent: number;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, Winner, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(Winner);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: WinnerBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<Winner, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        index: box.index,
        rewardPercent: box.rewardPercent,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   */
  convertEntityToData = (entities: Winner[]): WinnerBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
      index: data.index,
      rewardPercent: data.rewardPercent,
    }));
  };
}
