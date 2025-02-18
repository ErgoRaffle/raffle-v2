import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
  boxHasToken,
} from '@rosen-bridge/abstract-extractor';

import { WinnerPrizeAction } from '../actions/winnerPrize';
import { WinnerPrizeBoxInterface } from '../interfaces/types';
import { WinnerPrize } from '../entities';
import { ErgoAddress, Box, Network } from '@fleet-sdk/core';
import { SConstant, serializeBox } from '@fleet-sdk/serializer';

export class WinnerPrizeExtractor extends AbstractInitializableErgoExtractor<
  WinnerPrizeBoxInterface,
  WinnerPrize
> {
  readonly actions: WinnerPrizeAction;
  private readonly id: string;
  private readonly networkType: Network;
  private readonly ergoTree?: string;
  private readonly raffleId: string;
  private readonly TicketTokenId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    networkType: Network,
    url: string,
    type: ErgoNetworkType,
    address: string,
    raffleId: string,
    TicketTokenId: string,
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
    this.TicketTokenId = TicketTokenId;
    this.actions = new WinnerPrizeAction(dataSource, this.logger);
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
      box.ergoTree == this.ergoTree && boxHasToken(box, [this.TicketTokenId])
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): WinnerPrizeBoxInterface | undefined => {
    const ergoBox = box as Box;
    const r4Register = SConstant.from(ergoBox.additionalRegisters.R4!)
      .data as bigint[];
    const winnerIndex = SConstant.from(ergoBox.additionalRegisters.R5!)
      .data as number;
    const unwrappedGiftCount = Number(
      SConstant.from(ergoBox.additionalRegisters.R6!).data as bigint,
    );

    const data = {
      boxId: ergoBox.boxId.toString(),
      txId: ergoBox.transactionId,
      raffleId: this.raffleId,
      winnerTicketIndex: Number(r4Register[0]),
      giftCount: Number(r4Register[1]),
      winnerIndex: winnerIndex,
      unwrappedGiftCount: unwrappedGiftCount,
      serialized: Buffer.from(serializeBox(ergoBox).toBytes()).toString(
        'base64',
      ),
      extractor: this.id,
    };

    return data;
  };
}
