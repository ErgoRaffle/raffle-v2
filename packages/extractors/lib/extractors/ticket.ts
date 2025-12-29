import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractInitializableErgoExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import {
  OutputBox,
  ErgoNetworkType,
  InputExtension,
} from '@rosen-bridge/scanner-interfaces';

import { TicketAction } from '../actions/ticket';
import { TicketEntity } from '../entities';
import { TicketBoxInterface } from '../interfaces/types';

export class TicketExtractor extends AbstractInitializableErgoExtractor<
  TicketBoxInterface,
  TicketEntity
> {
  readonly actions: TicketAction;
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
    this.actions = new TicketAction(dataSource, this.logger);
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
        box.additionalRegisters.R5 != undefined &&
        (SConstant.from(box.additionalRegisters.R5).data as bigint[]).length ==
          4
      );
    } catch (err) {
      this.logger.error(`TicketExtractor Error: ${err}`);
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
  ): TicketBoxInterface | undefined => {
    let donatorErgoTree = '';
    try {
      donatorErgoTree = Buffer.from(
        (SConstant.from(inputExtensions[0]['0']).data as Uint8Array[])[0],
      ).toString('hex');
    } catch (err) {
      this.logger.warn(
        `TicketExtractor failed on extracting data due to invalid or missing inputExtension: ${err}`,
      );
      return undefined;
    }
    const r5Register = SConstant.from(box.additionalRegisters.R5!)
      .data as bigint[];

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets[0].tokenId,
      donatorErgoTree: donatorErgoTree,
      rangeStart: r5Register[0],
      rangeEnd: r5Register[1],
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
