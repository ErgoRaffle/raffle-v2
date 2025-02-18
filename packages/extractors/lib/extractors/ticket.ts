import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  boxHasToken,
} from '@rosen-bridge/abstract-extractor';

import { TicketAction } from '../actions/ticket';
import { TicketBoxInterface } from '../interfaces/types';
import { Ticket } from '../entities';
import { ErgoAddress, Box, Network } from '@fleet-sdk/core';
import { SByte, SColl, SConstant, serializeBox } from '@fleet-sdk/serializer';

export class TicketExtractor extends AbstractInitializableErgoExtractor<
  TicketBoxInterface,
  Ticket
> {
  readonly actions: TicketAction;
  private readonly id: string;
  private readonly networkType: Network;
  private readonly ergoTree?: string;
  private readonly raffleId: string;
  private readonly ticketTokenId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    networkType: Network,
    url: string,
    type: ErgoNetworkType,
    address: string,
    raffleId: string,
    ticketTokenId: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.networkType = networkType;
    this.ergoTree = address
      ? ErgoAddress.fromBase58(address).ergoTree.toString()
      : undefined;
    this.raffleId = raffleId;
    this.ticketTokenId = ticketTokenId;
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
    return (
      box.ergoTree == this.ergoTree && boxHasToken(box, [this.ticketTokenId])
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): TicketBoxInterface | undefined => {
    const ergoBox = box as Box;
    const donatorErgoTree = SColl(
      SByte,
      Array.from(
        SConstant.from(ergoBox.additionalRegisters.R4!).data as Uint8Array,
      ),
    ).toHex();
    const r5Register = SConstant.from(ergoBox.additionalRegisters.R5!)
      .data as bigint[];

    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: ergoBox.transactionId,
      raffleId: this.raffleId,
      donatorErgoTree: donatorErgoTree,
      rangeStart: r5Register[0],
      rangeEnd: r5Register[1],
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      extractor: this.id,
    };

    return data;
  };
}
