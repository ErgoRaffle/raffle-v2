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
import { SafePayBoxInterface } from '../interfaces/types';
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
    successRaffleAddress: string,
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
      ErgoAddress.fromBase58(successRaffleAddress).ergoTree.toString();
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
   * create spend info array for the transaction
   * @param tx
   * @returns spend info array of the transaction
   */
  getTransactionExtraData = (tx: Transaction) => {
    let parsingRaffleIdRaisedError = '';
    let txType: string = 'unknown';
    let raffleId: string = 'unknown';
    if (tx.outputs[0].ergoTree == this.serviceErgoTree) {
      txType = 'LicenseRedeem';
    } else if (tx.outputs[0].ergoTree == this.successRaffleErgoTree) {
      txType = 'Success';
      try {
        raffleId = tx.outputs[0].assets![1].tokenId;
      } catch (err) {
        parsingRaffleIdRaisedError = `SafePayExtractor parsing raffle-id error: ${err}`;
      }
    } else if (tx.outputs[0].ergoTree == this.winnerPrizeErgoTree) {
      txType = 'GiftUnwrap';
      try {
        raffleId = tx.outputs[0].assets![0].tokenId;
      } catch (err) {
        parsingRaffleIdRaisedError = `SafePayExtractor parsing raffle-id error: ${err}`;
      }
    } else if (tx.outputs[0].ergoTree == this.winnerErgoTree) {
      txType = 'GiftReturn';
      try {
        raffleId = tx.outputs[0].assets![0].tokenId;
      } catch (err) {
        parsingRaffleIdRaisedError = `SafePayExtractor parsing raffle-id error: ${err}`;
      }
    } else if (tx.outputs[0].ergoTree == this.ticketRedeemErgoTree) {
      txType = 'TicketRedeem';
      try {
        raffleId = tx.outputs[0].assets![0].tokenId;
      } catch (err) {
        parsingRaffleIdRaisedError = `SafePayExtractor parsing raffle-id error: ${err}`;
      }
    } else if (tx.inputs.length == 1) {
      txType = 'FinalPrize';
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
      raffleId: txExtra?.raffleId || 'unknown',
      txType: txExtra?.txType || 'unknown',
      serialized: Buffer.from(serializeBox(box as Box).toBytes()).toString(
        'base64',
      ),
    };

    return data;
  };
}
