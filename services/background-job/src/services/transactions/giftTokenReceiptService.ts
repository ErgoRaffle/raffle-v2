import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { GiftTokenReceiptTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { RaffleBoxType } from '@ergo-raffle/extractors';
import { AbstractTxService } from './abstractTxService';
import { getConfig } from '../../config/config';
import { GiftTokenRepoBuilder } from '@ergo-raffle/boxes';
import { findWinner } from '../../transactions/boxFinder';

export class GiftTokenReceiptService extends AbstractTxService {
  name = 'GiftTokenReceiptService';

  constructor(nodeUrl: string, logger: AbstractLogger) {
    super(nodeUrl, logger);
  }

  /**
   * Initialize the service
   * @param nodeUrl - The node url
   * @param logger - The logger
   */
  static init = (nodeUrl: string, logger: AbstractLogger) => {
    if (this.instance != undefined) return;
    this.instance = new GiftTokenReceiptService(nodeUrl, logger);
  };

  /**
   * Callback for gift token receipt transaction
   */
  private giftTokenReceiptCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
    unspentBoxes: ErgoBox[],
  ): Promise<void> => {
    // Find gift token repo box in the provided boxes
    const giftTokenRepo = boxes[0];
    const giftTokenRepoBuilder = GiftTokenRepoBuilder.fromBox(giftTokenRepo);
    const ticketId = giftTokenRepoBuilder.getTicketId();
    const step = giftTokenRepoBuilder.getStep();
    this.logger.debug(
      `Processing gift token receipt transaction for gift token repo with id [${giftTokenRepo.boxId}], for raffle id [${ticketId}] and step [${step}]`,
    );

    // Find winner box for the raffle by its index
    const winnerBox = await findWinner(unspentBoxes, ticketId, step);
    if (!winnerBox) {
      this.logger.error(
        `The related winner box not found, skipping gift token receipt transaction for gift token repo with id [${giftTokenRepo.boxId}]`,
      );
      return;
    }

    this.logger.debug(
      `The related winner box found with id [${winnerBox.boxId}], building gift token receipt transaction`,
    );
    const giftReceiptTxBuilder = new GiftTokenReceiptTxBuilder()
      .setGiftTokenRepo(giftTokenRepo)
      .setWinner(winnerBox)
      .setTxFee(getConfig().ergo.fee)
      .setChainHeight(await this.network.getHeight());

    const giftReceiptTx = await signAndAddTx(
      this.network,
      giftReceiptTxBuilder.build(),
      TxType.GiftTokenReceipt,
    );

    this.logger.info(
      `Gift receipt transaction has been added (txId: [${giftReceiptTx.id}])`,
    );
  };

  /**
   * Add the gift token repo box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.giftTokenRepo,
      value: undefined, // We'll get all gift token repo boxes one by one
      tokens: [],
      onSuffice: this.giftTokenReceiptCallback,
      getMinedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getRaffleBoxes(
            undefined, // We'll get all gift token repo boxes
            RaffleBoxType.GiftTokenRepo,
          ),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
  }
}
