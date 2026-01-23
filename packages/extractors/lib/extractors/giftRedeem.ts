import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';
import { AbstractInitializableErgoExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox, ErgoNetworkType } from '@rosen-bridge/scanner-interfaces';

import { GiftRedeemAction } from '../actions/giftRedeem';
import { GiftRedeemEntity } from '../entities';
import { GiftRedeemBoxInterface } from '../interfaces/types';

export class GiftRedeemExtractor extends AbstractInitializableErgoExtractor<
  GiftRedeemBoxInterface,
  GiftRedeemEntity
> {
  readonly actions: GiftRedeemAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly raffleLicenseId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    raffleLicenseId: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.raffleLicenseId = raffleLicenseId;
    this.actions = new GiftRedeemAction(dataSource, logger);
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
        box.additionalRegisters.R6 != undefined &&
        (SConstant.from(box.additionalRegisters.R6).data as number) !=
          undefined &&
        box.assets.length > 1 &&
        box.assets[0].tokenId == this.raffleLicenseId
      );
    } catch (err) {
      this.logger.error(`GiftRedeemExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): GiftRedeemBoxInterface | undefined => {
    const step = SConstant.from(box.additionalRegisters.R6!).data as number;
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets[1].tokenId,
      step: step,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
