import { ErgoAddress, Box } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';
import { AbstractErgoBoxExtractor } from '@rosen-bridge/abstract-extractor';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { DataSource } from '@rosen-bridge/extended-typeorm';
import { OutputBox } from '@rosen-bridge/scanner-interfaces';

import { RaffleBoxAction } from '../actions/raffleBoxAction';
import { RaffleBoxEntity } from '../entities';
import { RaffleBoxType } from '../entities/raffleBoxEntity';
import { ExtractorInitOptions, RaffleBoxInterface } from '../interfaces/types';

export class ActiveRaffleExtractor extends AbstractErgoBoxExtractor<
  RaffleBoxInterface,
  RaffleBoxEntity
> {
  readonly actions: RaffleBoxAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly raffleLicense: string;

  constructor(
    dataSource: DataSource,
    id: string,
    initializeOptions: ExtractorInitOptions,
    raffleLicense: string,
    logger?: AbstractLogger,
  ) {
    super({ active: true, ...initializeOptions }, logger);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(
      initializeOptions.address,
    ).ergoTree.toString();
    this.actions = new RaffleBoxAction(dataSource, logger);
    this.raffleLicense = raffleLicense;
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
        box.assets!.length >= 2 &&
        box.assets!.length <= 3 &&
        box.assets![0].tokenId == this.raffleLicense
      );
    } catch (err) {
      this.logger.error(`ActiveRaffleExtractor Error: ${err}`);
      return false;
    }
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): RaffleBoxInterface | undefined => {
    const data = {
      identifier: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: box.assets![1].tokenId,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
      type: RaffleBoxType.ActiveRaffle,
    };

    return data;
  };
}
