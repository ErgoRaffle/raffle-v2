import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  boxHasToken,
} from '@rosen-bridge/abstract-extractor';

import { GiftAction } from '../actions/gift';
import { GiftBoxInterface } from '../interfaces/types';
import { Gift } from '../entities';
import { ErgoAddress, Box, Network } from '@fleet-sdk/core';
import { SByte, SColl, SConstant, serializeBox } from '@fleet-sdk/serializer';

export class GiftExtractor extends AbstractInitializableErgoExtractor<
  GiftBoxInterface,
  Gift
> {
  readonly actions: GiftAction;
  private readonly id: string;
  private readonly networkType: Network;
  private readonly ergoTree?: string;
  private readonly raffleId: string;
  private readonly giftTokenId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    networkType: Network,
    url: string,
    type: ErgoNetworkType,
    address: string,
    raffleId: string,
    giftTokenId: string,
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
    this.giftTokenId = giftTokenId;
    this.actions = new GiftAction(dataSource, this.logger);
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
      box.ergoTree == this.ergoTree && boxHasToken(box, [this.giftTokenId])
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): GiftBoxInterface | undefined => {
    const ergoBox = box as Box;
    const donatorErgoTree = SColl(
      SByte,
      Array.from(
        SConstant.from(ergoBox.additionalRegisters.R4!).data as Uint8Array,
      ),
    ).toHex();
    const index = SConstant.from(ergoBox.additionalRegisters.R5!)
      .data as number;

    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: ergoBox.transactionId,
      raffleId: this.raffleId,
      donatorErgoTree: donatorErgoTree,
      winnerIndex: index,
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      extractor: this.id,
    };

    return data;
  };
}
