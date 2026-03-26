import { ErgoAddress } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoBoxExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox, InputExtension } from '@rosen-bridge/scanner-interfaces';

import { AddGiftProxyAction } from '../actions/addGiftProxy';
import { AddGiftProxyEntity } from '../entities';
import {
  AddGiftProxyBoxInterface,
  ExtractorInitOptions,
} from '../interfaces/types';

export class AddGiftProxyExtractor extends AbstractErgoBoxExtractor<
  AddGiftProxyBoxInterface,
  AddGiftProxyEntity
> {
  readonly actions: AddGiftProxyAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly address: string;

  constructor(
    dataSource: DataSource,
    id: string,
    initializeOptions: ExtractorInitOptions,
    logger?: AbstractLogger,
  ) {
    super({ active: true, ...initializeOptions }, logger);
    this.id = id;
    this.address = initializeOptions.address;
    this.ergoTree = ErgoAddress.fromBase58(this.address).ergoTree.toString();
    this.actions = new AddGiftProxyAction(dataSource, logger);
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
          4 &&
        box.additionalRegisters.R5 != undefined &&
        (SConstant.from(box.additionalRegisters.R5).data as Uint8Array[])
          .length == 2
      );
    } catch (err) {
      this.logger.error(`AddGiftProxyExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (
    box: OutputBox,
    inputExtensions: InputExtension[],
  ): AddGiftProxyBoxInterface | undefined => {
    const r4Register = SConstant.from(box.additionalRegisters!.R4!)
      .data as bigint[];
    const r5Register = SConstant.from(box.additionalRegisters!.R5!)
      .data as Uint8Array[];
    let giftGiverErgoTree = '';
    try {
      const extensionData = SConstant.from(inputExtensions[0]['0'])
        .data as Uint8Array;
      giftGiverErgoTree = Buffer.from(extensionData).toString('hex');
    } catch (err) {
      this.logger.warn(
        `AddGiftProxyExtractor failed on extracting data due to invalid or missing inputExtension: ${err}`,
      );
      return undefined;
    }

    return {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      address: this.address,
      expirationHeight: Number(r4Register[0]),
      raffleDeadline: Number(r4Register[1]),
      winnerIndex: Number(r4Register[2]),
      txFee: r4Register[3],
      raffleId: Buffer.from(r5Register[0]).toString('hex'),
      giftGiverErgoTree: giftGiverErgoTree,
      serialized: Buffer.from(serializeBox(box).toBytes()).toString('base64'),
    };
  };
}
