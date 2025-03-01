import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { TicketRedeemAction } from '../actions/ticketRedeem';
import { TicketRedeemBoxInterface } from '../interfaces/types';
import { TicketRedeemEntity } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class TicketRedeemExtractor extends AbstractInitializableErgoExtractor<
  TicketRedeemBoxInterface,
  TicketRedeemEntity
> {
  readonly actions: TicketRedeemAction;
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
    this.actions = new TicketRedeemAction(dataSource, this.logger);
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
        (SConstant.from(box.additionalRegisters!.R4!).data as bigint[])
          .length == 3 &&
        (SConstant.from(box.additionalRegisters!.R5!).data as bigint) !=
          undefined &&
        box.assets!.length > 1 &&
        box.assets!.length <= 3
      );
    } catch (err) {
      this.logger.error(`TicketRedeemExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): TicketRedeemBoxInterface | undefined => {
    const r4Register = SConstant.from(box.additionalRegisters!.R4!)
      .data as bigint[];
    const redeemedTickets = SConstant.from(box.additionalRegisters!.R5!)
      .data as bigint;

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![1].tokenId,
      totalSoldTicket: r4Register[0],
      redeemedTickets: redeemedTickets,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
