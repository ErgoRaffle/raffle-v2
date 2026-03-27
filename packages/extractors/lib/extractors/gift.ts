import { ErgoAddress } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import {
  AbstractErgoBoxExtractor,
  TxExtra,
} from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  OutputBox,
  Transaction,
  InputExtension,
} from '@rosen-bridge/scanner-interfaces';

import { GiftAction } from '../actions/gift';
import { GiftEntity } from '../entities';
import { ExtractorInitOptions, GiftBoxInterface } from '../interfaces/types';

export class GiftExtractor extends AbstractErgoBoxExtractor<
  GiftBoxInterface,
  GiftEntity
> {
  readonly actions: GiftAction;
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
    this.actions = new GiftAction(dataSource, logger);
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
        box.additionalRegisters.R5 != undefined &&
        (SConstant.from(box.additionalRegisters.R5).data as number) != undefined
      );
    } catch (err) {
      this.logger.error(`GiftExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract raffle-Id information
   * @param tx
   * @returns
   */
  getTransactionExtraData = (tx: Transaction) => {
    return {
      raffleId: tx.outputs[0].assets[0].tokenId || '',
    };
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @param raffleId
   * @return extracted data in proper format
   */
  extractBoxData = (
    box: OutputBox,
    inputExtensions: InputExtension[],
    txExtra?: TxExtra,
  ): GiftBoxInterface | undefined => {
    const index = SConstant.from(box.additionalRegisters.R5!).data as number;
    let donatorErgoTree = '';
    try {
      donatorErgoTree = Buffer.from(
        SConstant.from(inputExtensions[0]['0']).data as Uint8Array,
      ).toString('hex');
    } catch (err) {
      this.logger.warn(
        `GiftExtractor failed on extracting data due to invalid or missing inputExtension: ${err}`,
      );
      return undefined;
    }
    const data = {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: txExtra?.raffleId || '',
      donatorErgoTree: donatorErgoTree,
      winnerIndex: index,
      serialized: Buffer.from(serializeBox(box).toBytes()).toString('base64'),
    };

    return data;
  };
}
