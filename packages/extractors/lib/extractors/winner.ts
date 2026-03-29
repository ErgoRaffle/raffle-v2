import { ErgoAddress } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoBoxExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox } from '@rosen-bridge/scanner-interfaces';

import { WinnerAction } from '../actions/winner';
import { WinnerEntity } from '../entities';
import { ExtractorInitOptions, WinnerBoxInterface } from '../interfaces/types';

export class WinnerExtractor extends AbstractErgoBoxExtractor<
  WinnerBoxInterface,
  WinnerEntity
> {
  readonly actions: WinnerAction;
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
    this.actions = new WinnerAction(dataSource, logger);
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
        box.assets!.length >= 1 &&
        box.assets!.length <= 2 &&
        box.additionalRegisters != undefined &&
        box.additionalRegisters.R4 != undefined &&
        (SConstant.from(box.additionalRegisters.R4).data as bigint[]).length ==
          3 &&
        box.additionalRegisters.R5 != undefined &&
        (SConstant.from(box.additionalRegisters.R5).data as number) != undefined
      );
    } catch (err) {
      this.logger.error(`WinnerExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): WinnerBoxInterface | undefined => {
    const R4Serialized = SConstant.from(box.additionalRegisters!.R4!)
      .data as bigint[];
    const index = SConstant.from(box.additionalRegisters!.R5!).data as number;
    const data = {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![0].tokenId,
      index: index,
      rewardPercent: Number(R4Serialized[0]),
      serialized: Buffer.from(serializeBox(box).toBytes()).toString('base64'),
    };

    return data;
  };
}
