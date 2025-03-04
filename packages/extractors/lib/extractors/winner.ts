import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { WinnerAction } from '../actions/winner';
import { WinnerBoxInterface } from '../interfaces/types';
import { WinnerEntity } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class WinnerExtractor extends AbstractInitializableErgoExtractor<
  WinnerBoxInterface,
  WinnerEntity
> {
  readonly actions: WinnerAction;
  private readonly id: string;
  private readonly ergoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.actions = new WinnerAction(dataSource, this.logger);
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
  hasData = (box: OutputBox): boolean => {
    try {
      return (
        box.ergoTree == this.ergoTree &&
        box.assets!.length >= 1 &&
        box.assets!.length <= 2 &&
        box.additionalRegisters != undefined &&
        box.additionalRegisters.R4 != undefined &&
        (SConstant.from(box.additionalRegisters!.R4!).data as bigint[])
          .length == 3 &&
        box.additionalRegisters.R5 != undefined &&
        (SConstant.from(box.additionalRegisters!.R5!).data as number) !=
          undefined
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
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![0].tokenId,
      index: index,
      rewardPercent: Number(R4Serialized[0]),
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
