import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { AbstractInitializableErgoExtractor } from '@rosen-bridge/abstract-extractor';
import {
  OutputBox,
  ErgoNetworkType,
  InputExtension,
} from '@rosen-bridge/scanner-interfaces';

import { SuccessRaffleAction } from '../actions/successRaffle';
import { SuccessRaffleBoxInterface } from '../interfaces/types';
import { SuccessRaffleEntity } from '../entities';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class SuccessRaffleExtractor extends AbstractInitializableErgoExtractor<
  SuccessRaffleBoxInterface,
  SuccessRaffleEntity
> {
  readonly actions: SuccessRaffleAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly raffleLicenseId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    address: string,
    raffleLicenseId: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(ErgoNetworkType.Node, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.raffleLicenseId = raffleLicenseId;
    this.actions = new SuccessRaffleAction(dataSource, this.logger);
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
        box.assets.length > 1 &&
        box.additionalRegisters.R8 != undefined &&
        (SConstant.from(box.additionalRegisters.R8).data as number) !=
          undefined &&
        box.assets[0].tokenId == this.raffleLicenseId
      );
    } catch (err) {
      this.logger.error(`SuccessRaffleExtractor Error: ${err}`);
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
  ): SuccessRaffleBoxInterface | undefined => {
    let selectedWinnersList = '';
    try {
      selectedWinnersList = (
        SConstant.from(inputExtensions[0]['0']).data as bigint[]
      ).toString();
    } catch (err) {
      this.logger.error(`SuccessRaffleExtractor Error: ${err}`);
    }

    const step = SConstant.from(box.additionalRegisters.R8!).data as number;
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets[0].tokenId,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
      selectedWinnersList: selectedWinnersList,
      step: step,
    };

    return data;
  };
}
