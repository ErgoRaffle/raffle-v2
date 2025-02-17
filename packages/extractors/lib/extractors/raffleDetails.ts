import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  boxHasToken,
} from '@rosen-bridge/abstract-extractor';
import { ErgoAddress, Box, Network } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

import { RaffleDetails, Picture } from '@ergo-raffle/extractors/lib/entities';
import { RaffleDetailsAction } from '../actions/raffleDetails';
import { RaffleDetailsBoxInterface } from '../interfaces/types';

export class RaffleDetailsExtractor extends AbstractInitializableErgoExtractor<
  RaffleDetailsBoxInterface,
  RaffleDetails
> {
  readonly actions: RaffleDetailsAction;
  private readonly id: string;
  private readonly networkType: Network;
  private readonly ergoTree?: string;
  private readonly raffleId: string;
  private readonly ticketTokenId: string;
  private readonly dataSource: DataSource;

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
    this.dataSource = dataSource;
    this.actions = new RaffleDetailsAction(dataSource, this.logger);
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
  extractBoxData = (box: OutputBox): RaffleDetailsBoxInterface | undefined => {
    const ergoBox = box as Box;
    const R4Serialized = SConstant.from(ergoBox.additionalRegisters.R4!)
      .data as Uint8Array[];
    for (let i = 0; i < R4Serialized.slice(2).length; i++) {
      this.dataSource
        .createQueryBuilder()
        .insert()
        .into(Picture)
        .values([
          {
            orderIndex: i,
            raffleId: this.raffleId,
            content: String.fromCharCode(...R4Serialized.slice(2)[i]),
          },
        ])
        .execute();
    }

    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: ergoBox.transactionId,
      raffleId: this.raffleId,
      name: String.fromCharCode(...R4Serialized[0]),
      description: String.fromCharCode(...R4Serialized[1]),
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      extractor: this.id,
    };

    return data;
  };
}
