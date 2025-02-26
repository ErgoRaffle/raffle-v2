import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { WinnerBoxInterface } from '../interfaces/types';
import { WinnerEntity } from '../entities/winner';
import { pick } from 'lodash-es';

export class WinnerAction extends AbstractInitializableErgoExtractorAction<
  WinnerBoxInterface,
  WinnerEntity
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<WinnerEntity>;
  private readonly index: number;
  private readonly rewardPercent: number;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, WinnerEntity, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(WinnerEntity);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: WinnerBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<WinnerEntity, 'id'>[] => {
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
   * @param data
   */
  convertEntityToData = (entities: WinnerEntity[]): WinnerBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'index',
        'rewardPercent',
      ]),
    );
  };
}
