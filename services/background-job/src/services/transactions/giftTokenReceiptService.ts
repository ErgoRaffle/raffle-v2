import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { GiftTokenReceiptTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { RaffleBoxType } from '@ergo-raffle/extractors';
import { GiftTokenRepoBuilder, WinnerBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { configs } from '../../config';
import { findAllWinners } from '../../transactions/boxFinder';

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
   * - Builds the gift token receipt transaction for each winner and chains them to each other
   * @param boxes - The boxes to process
   * @param unspentBoxes - The unspent boxes
   * @returns void
   */
  private giftTokenReceiptCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
    unspentBoxes: ErgoBox[],
  ): Promise<void> => {
    // Find gift token repo box in the provided boxes
    let giftTokenRepo = boxes[0];
    const giftTokenRepoBuilder = GiftTokenRepoBuilder.fromBox(giftTokenRepo);
    const ticketId = giftTokenRepoBuilder.getTicketId();
    const step = giftTokenRepoBuilder.getStep();

    // find all winner boxes for the raffle
    const winnerBoxes = await findAllWinners(unspentBoxes, ticketId);

    for (let i = step; i <= giftTokenRepoBuilder.getWinnersCount(); i++) {
      const winnerBox = winnerBoxes.find((box) => {
        const winnerBoxBuilder = WinnerBuilder.fromBox(box);
        return winnerBoxBuilder.getWinnerIndex() === i;
      });
      if (!winnerBox) {
        this.logger.error(
          `The related winner box not found with index ${i}, skipping gift token receipt transaction for gift token repo with id [${giftTokenRepo.boxId}]`,
        );
        return;
      }
      this.logger.debug(
        `The related winner box found with id [${winnerBox.boxId}], building gift token receipt transaction`,
      );
      const giftReceiptTxBuilder = new GiftTokenReceiptTxBuilder()
        .setGiftTokenRepo(giftTokenRepo)
        .setWinner(winnerBox)
        .setTxFee(configs.ergo.fee)
        .setChainHeight(await this.network.getHeight());

      const giftReceiptTx = await signAndAddTx(
        this.network,
        giftReceiptTxBuilder.build(),
        TxType.GiftTokenReceipt,
      );

      this.logger.info(
        `Gift token receipt transaction has been added (txId: [${giftReceiptTx.id}])`,
      );
      giftTokenRepo = new ErgoBox(giftReceiptTx.outputs[1]);
    }
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
