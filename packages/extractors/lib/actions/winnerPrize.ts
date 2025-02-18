import { DataSource, Repository } from 'typeorm';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractorAction,
  BlockInfo,
} from '@rosen-bridge/abstract-extractor';

import { WinnerPrizeBoxInterface } from '../interfaces/types';
import { WinnerPrize } from '../entities/winnerPrize';

export class WinnerPrizeAction extends AbstractInitializableErgoExtractorAction<
  WinnerPrizeBoxInterface,
  WinnerPrize
> {
  private readonly dataSource: DataSource;
  readonly logger: AbstractLogger;
  public repository: Repository<WinnerPrize>;
  private readonly index: number;
  private readonly rewardPercent: number;

  constructor(dataSource: DataSource, logger?: AbstractLogger) {
    super(dataSource, WinnerPrize, logger);
    this.dataSource = dataSource;
    this.logger = logger ? logger : new DummyLogger();
    this.repository = dataSource.getRepository(WinnerPrize);
  }

  /**
   * create the box entity from extracted data and block information
   */
  createEntity = (
    boxes: WinnerPrizeBoxInterface[],
    block: BlockInfo,
    extractor: string,
  ): Omit<WinnerPrize, 'id'>[] => {
    return boxes.map((box) => {
      return {
        boxId: box.boxId,
        block: block.hash,
        height: block.height,
        serialized: box.serialized,
        extractor: extractor,
        txId: box.txId,
        raffleId: box.raffleId,
        winnerTicketIndex: box.winnerTicketIndex,
        giftCount: box.giftCount,
        winnerIndex: box.winnerIndex,
        unwrappedGiftCount: box.unwrappedGiftCount,
      };
    });
  };

  /**
   * convert the database entity back to raw data
   */
  convertEntityToData = (
    entities: WinnerPrize[],
  ): WinnerPrizeBoxInterface[] => {
    return entities.map((data) => ({
      boxId: data.boxId,
      txId: data.txId,
      raffleId: data.raffleId,
      extractor: data.extractor,
      serialized: data.serialized,
      winnerTicketIndex: data.winnerTicketIndex,
      giftCount: data.giftCount,
      winnerIndex: data.winnerIndex,
      unwrappedGiftCount: data.unwrappedGiftCount,
    }));
  };
}
