import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { TicketAction } from '../actions/ticket';
import { TicketBoxInterface } from '../interfaces/types';
import { Ticket } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SByte, SColl, SConstant, serializeBox } from '@fleet-sdk/serializer';

export class TicketExtractor extends AbstractInitializableErgoExtractor<
  TicketBoxInterface,
  Ticket
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
    return box.ergoTree == this.ergoTree;
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): TicketBoxInterface | undefined => {
    const donatorErgoTree = SColl(
      SByte,
      Array.from(
        SConstant.from(box.additionalRegisters!.R4!).data as Uint8Array,
      ),
    ).toHex();
    const r5Register = SConstant.from(box.additionalRegisters!.R5!)
      .data as bigint[];

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![0].tokenId,
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
