import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { GiftRedeemBoxInterface } from '../interfaces/types';
import { GiftRedeemEntity } from '../entities';
import { pick } from 'lodash-es';

export class GiftRedeemAction extends AbstractInitializableErgoExtractorAction<
  GiftRedeemBoxInterface,
  GiftRedeemEntity
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<GiftRedeemEntity>;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, GiftRedeemEntity, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(GiftRedeemEntity);
  }

  /**
   * create the box entity from extracted data and block information
   * @param boxes
   * @param block
   * @param extractor
   */
  createEntity = (
    boxes: GiftRedeemBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<GiftRedeemEntity, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        step: box.step,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   * @param entities
   */
  convertEntityToData = (
    entities: GiftRedeemEntity[],
  ): GiftRedeemBoxInterface[] => {
    return entities.map((data) =>
      pick(data, [
        'boxId',
        'txId',
        'raffleId',
        'extractor',
        'serialized',
        'step',
      ]),
    );
  };
}
