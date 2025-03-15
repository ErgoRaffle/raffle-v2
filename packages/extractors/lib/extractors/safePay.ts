import { DataSource } from 'typeorm';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  TxExtra,
} from '@rosen-bridge/abstract-extractor';
import { ErgoAddress, Box } from '@fleet-sdk/core';
import { serializeBox } from '@fleet-sdk/serializer';

import { SafePayEntity } from '../entities';
import { SafePayAction } from '../actions/safePay';
import { SafePayBoxInterface, TxType } from '../interfaces/types';
import {
  Transaction,
  OutputBox,
  ErgoNetworkType,
  InputExtension,
} from '@rosen-bridge/scanner-interfaces';

export class SafePayExtractor extends AbstractInitializableErgoExtractor<
  SafePayBoxInterface,
  SafePayEntity
> {
  readonly actions: SafePayAction;
  private readonly id: string;
  private readonly ergoTree: string;
  private readonly serviceErgoTree: string;
  private readonly successRaffleErgoTree: string;
  private readonly winnerPrizeErgoTree: string;
  private readonly winnerErgoTree: string;
  private readonly ticketRedeemErgoTree: string;

  constructor(
    dataSource: DataSource,
    id: string,
    url: string,
    type: ErgoNetworkType,
    address: string,
    serviceAddress: string,
    successAddress: string,
    winnerPrizeAddress: string,
    winnerAddress: string,
    ticketRedeemAddress: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.ergoTree = ErgoAddress.fromBase58(address).ergoTree.toString();
    this.actions = new SafePayAction(dataSource, this.logger);

    this.serviceErgoTree =
      ErgoAddress.fromBase58(serviceAddress).ergoTree.toString();
    this.successRaffleErgoTree =
      ErgoAddress.fromBase58(successAddress).ergoTree.toString();
    this.winnerPrizeErgoTree =
      ErgoAddress.fromBase58(winnerPrizeAddress).ergoTree.toString();
    this.winnerErgoTree =
      ErgoAddress.fromBase58(winnerAddress).ergoTree.toString();
    this.ticketRedeemErgoTree =
      ErgoAddress.fromBase58(ticketRedeemAddress).ergoTree.toString();
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

  /**
   * extract transaction raffle-id and tx-type extra information
   * @param tx
   * @returns raffle-id and tx-type
   */
  getTransactionExtraData = (tx: Transaction) => {
    let parsingRaffleIdRaisedError = '';
    let txType: TxType = TxType.Unknown;
    let raffleId: string = 'unknown';
    if (tx.outputs[0].ergoTree == this.serviceErgoTree) {
      txType = TxType.LicenseRedeem;
    } else if (tx.outputs[0].ergoTree == this.successRaffleErgoTree) {
      txType = TxType.ServiceAndImplementerFees;
      try {
        raffleId = tx.outputs[0].assets![1].tokenId;
      } catch (err) {
        parsingRaffleIdRaisedError = `SafePayExtractor parsing raffle-id error: ${err}`;
      }
    } else if (tx.outputs[0].ergoTree == this.winnerPrizeErgoTree) {
      txType = TxType.GiftUnwrap;
    } else if (tx.outputs[0].ergoTree == this.winnerErgoTree) {
      txType = TxType.GiftReturn;
      try {
        raffleId = tx.outputs[0].assets![0].tokenId;
      } catch (err) {
        parsingRaffleIdRaisedError = `SafePayExtractor parsing raffle-id error: ${err}`;
      }
    } else if (tx.outputs[0].ergoTree == this.ticketRedeemErgoTree) {
      txType = TxType.TicketRedeem;
      try {
        raffleId = tx.outputs[0].assets![0].tokenId;
      } catch (err) {
        parsingRaffleIdRaisedError = `SafePayExtractor parsing raffle-id error: ${err}`;
      }
    } else if (tx.inputs.length == 1) {
      txType = TxType.FinalPrize;
    }

    return {
      parsingRaffleIdRaisedError: parsingRaffleIdRaisedError,
      raffleId: raffleId,
      txType: txType,
    };
  };

  /**
   * check proper data format in the box
   * @param box
   * @return true if the box has the required data and false otherwise
   */
  hasData = (box: OutputBox): boolean => {
    return box.ergoTree == this.ergoTree;
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (
    box: OutputBox,
    inputExtensions: InputExtension[],
    txExtra?: TxExtra,
  ): SafePayBoxInterface | undefined => {
    if (txExtra && txExtra.parsingRaffleIdRaisedError != '') {
      this.logger.warn(txExtra.parsingRaffleIdRaisedError);
      return undefined;
    }
    const data = {
      boxId: box.boxId.toString(),
      txId: box.transactionId,
      raffleId: txExtra != undefined ? txExtra.raffleId : 'Unknown',
      txType: txExtra != undefined ? txExtra.txType : TxType.Unknown,
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
