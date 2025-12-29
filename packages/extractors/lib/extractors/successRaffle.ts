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

import { SuccessRaffleAction } from '../actions/successRaffle';
import { SuccessRaffleEntity } from '../entities';
import { SuccessRaffleBoxInterface } from '../interfaces/types';

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
    let selectedWinnersList: bigint[] = [];
    let newWinnerIndex = undefined;
    const step = SConstant.from(box.additionalRegisters.R8!).data as number;

    if (step != 1) {
      try {
        selectedWinnersList = SConstant.from(inputExtensions[0]['0'])
          .data as bigint[];
        newWinnerIndex = SConstant.from(inputExtensions[0]['1']).data as bigint;
        this.logger.debug(
          `SuccessRaffleExtractor extension extracted data, selectedWinnersList: ${selectedWinnersList}, newWinnerIndex: ${newWinnerIndex}`,
        );
      } catch (err) {
        this.logger.warn(
          `SuccessRaffleExtractor failed on extracting data due to invalid or missing inputExtension: ${err}`,
        );
      }
    }

    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets[1].tokenId,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
      selectedWinnersList:
        step == 1 || newWinnerIndex == undefined
          ? ''
          : [...selectedWinnersList, newWinnerIndex].toString(),
      step: step,
    };

    return data;
  };
}
