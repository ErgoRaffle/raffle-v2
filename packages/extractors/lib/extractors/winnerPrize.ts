import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoBoxExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox } from '@rosen-bridge/scanner-interfaces';

import { WinnerPrizeAction } from '../actions/winnerPrize';
import { WinnerPrizeEntity } from '../entities';
import {
  ExtractorInitOptions,
  WinnerPrizeBoxInterface,
} from '../interfaces/types';

export class WinnerPrizeExtractor extends AbstractErgoBoxExtractor<
  WinnerPrizeBoxInterface,
  WinnerPrizeEntity
> {
  readonly actions: WinnerPrizeAction;
  private readonly id: string;
  private readonly ergoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    initializeOptions: ExtractorInitOptions,
    logger?: AbstractLogger,
  ) {
    super({ active: true, ...initializeOptions }, logger);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(
      initializeOptions.address,
    ).ergoTree.toString();
    this.actions = new WinnerPrizeAction(dataSource, logger);
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

  /**
   * check proper data format in the box
   * @param box
   * @return true if the box has the required data and false otherwise
   */
  hasBoxData = (box: OutputBox): boolean => {
    try {
      return (
        box.ergoTree == this.ergoTree &&
        box.additionalRegisters.R4 != undefined &&
        (SConstant.from(box.additionalRegisters.R4).data as bigint[]).length ==
          3 &&
        box.additionalRegisters.R5 != undefined &&
        (SConstant.from(box.additionalRegisters.R5).data as number) !=
          undefined &&
        box.additionalRegisters.R6 != undefined &&
        (SConstant.from(box.additionalRegisters.R6).data as bigint) !=
          undefined &&
        box.assets.length > 1
      );
    } catch (err) {
      this.logger.error(`WinnerPrizeExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): WinnerPrizeBoxInterface | undefined => {
    const r4Register = SConstant.from(box.additionalRegisters.R4!)
      .data as bigint[];
    const winnerIndex = SConstant.from(box.additionalRegisters.R5!)
      .data as number;
    const unwrappedGiftCount = Number(
      SConstant.from(box.additionalRegisters.R6!).data as bigint,
    );

    const data = {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets[0].tokenId,
      winnerTicketIndex: Number(r4Register[0]),
      giftCount: Number(r4Register[1]),
      winnerIndex: winnerIndex,
      unwrappedGiftCount: unwrappedGiftCount,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
