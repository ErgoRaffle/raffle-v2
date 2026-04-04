import { ErgoAddress } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoBoxExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox, InputExtension } from '@rosen-bridge/scanner-interfaces';

import { DonationProxyAction } from '../actions/donationProxy';
import { DonationProxyEntity } from '../entities';
import {
  DonationProxyBoxInterface,
  ExtractorInitOptions,
} from '../interfaces/types';

export class DonationProxyExtractor extends AbstractErgoBoxExtractor<
  DonationProxyBoxInterface,
  DonationProxyEntity
> {
  readonly actions: DonationProxyAction;
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
    this.actions = new DonationProxyAction(dataSource, logger);
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
      this.logger.error(`DonationProxyExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @param inputExtensions
   * @return extracted data in proper format
   */
  extractBoxData = (
    box: OutputBox,
    inputExtensions: InputExtension[],
  ): DonationProxyBoxInterface | undefined => {
    const r4Register = SConstant.from(box.additionalRegisters!.R4!)
      .data as bigint[];
    const r5Register = SConstant.from(box.additionalRegisters!.R5!)
      .data as Uint8Array[];
    let donatorErgoTree = '';
    try {
      const extensionData = SConstant.from(inputExtensions[0]['0'])
        .data as Uint8Array;
      donatorErgoTree = Buffer.from(extensionData).toString('hex');
    } catch (err) {
      this.logger.warn(
        `DonationProxyExtractor failed on extracting data due to invalid or missing inputExtension: ${err}`,
      );
      return undefined;
    }

    return {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      address: this.address,
      expirationHeight: Number(r4Register[0]),
      raffleDeadline: Number(r4Register[1]),
      ticketCount: Number(r4Register[2]),
      txFee: r4Register[3],
      raffleId: Buffer.from(r5Register[0]).toString('hex'),
      donatorErgoTree: donatorErgoTree,
      serialized: Buffer.from(serializeBox(box).toBytes()).toString('base64'),
    };
  };
}
