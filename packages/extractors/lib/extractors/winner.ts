import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  boxHasToken,
} from '@rosen-bridge/abstract-extractor';

import { WinnerAction } from '../actions/winner';
import { WinnerBoxInterface } from '../interfaces/types';
import { Winner } from '../entities';
import { ErgoAddress, Box, Network } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class WinnerExtractor extends AbstractInitializableErgoExtractor<
  WinnerBoxInterface,
  Winner
> {
  readonly actions: WinnerAction;
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
    return (
      box.ergoTree == this.ergoTree && boxHasToken(box, [this.ticketTokenId])
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): WinnerBoxInterface | undefined => {
    const ergoBox = box as Box;
    const R4Serialized = SConstant.from(ergoBox.additionalRegisters.R4!)
      .data as bigint[];
    const index = SConstant.from(ergoBox.additionalRegisters.R5!)
      .data as number;
    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: ergoBox.transactionId,
      raffleId: this.raffleId,
      index: index,
      rewardPercent: Number(R4Serialized[0]),
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      extractor: this.id,
    };

    return data;
  };
}
