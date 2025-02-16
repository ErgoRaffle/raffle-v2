import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { InactiveRaffleBoxInterface } from '../interfaces/types';
import { InactiveRaffle } from '../entities';

export class InactiveRaffleAction extends AbstractInitializableErgoExtractorAction<
  InactiveRaffleBoxInterface,
  InactiveRaffle
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<InactiveRaffle>;
  private readonly prefix = 'InactiveRaffle';

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, InactiveRaffle, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(InactiveRaffle);
  }

  createEntity = (
    boxes: InactiveRaffleBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<InactiveRaffle, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
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

  convertEntityToData = (
    entities: InactiveRaffle[],
  ): InactiveRaffleBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      block: data.block,
      height: data.height,
      serialized: data.serialized,
      extractor: data.extractor,
      txId: data.txId,
      serviceErgoTree: data.serviceErgoTree,
      implementorErgoTree: data.implementorErgoTree,
      creatorErgoTree: data.creatorErgoTree,
      serviceFeePercent: data.serviceFeePercent,
      implementerFeePercent: data.implementerFeePercent,
      winnersPercent: data.winnersPercent,
      ticketPrice: data.ticketPrice,
      goal: data.goal,
      deadline: data.deadline,
      winnersPercentList: data.winnersPercentList,
      txFee: data.txFee,
    }));
  };

  /**
   * remove all existing data for the extractor
   * @param extractor
   */
  removeAllData = async (extractor?: string) => {
    await this.repository.delete({
      extractor: this.prefix + (extractor ? `-${extractor}` : ''),
    });
  };
}
