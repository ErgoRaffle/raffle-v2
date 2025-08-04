import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import {
  FinalPrizeTxBuilder,
  GiftUnwrapTxBuilder,
} from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { WinnerPrizeBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { getConfig } from '../../config/config';

export class GiftAndPrizeService extends AbstractTxService {
  name = 'GiftAndPrizeService';

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
    this.instance = new GiftAndPrizeService(nodeUrl, logger);
  };

  /**
   * Callback for gift unwrap transaction
   * - Finds all the gifts belonging to the winner prize
   * - Builds the gift unwrap transaction for each gift and chains them to each other
   * - Builds the final prize transaction and chains it to the last gift unwrap transaction
   * Note: This callback assumes that the gift and ticket boxes are available in the database
   * @param boxes - The boxes to process
   * @returns void
   */
  private giftUnwrapCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const winnerPrizeBox = boxes[0];
    const winnerPrizeBuilder = WinnerPrizeBuilder.fromBox(winnerPrizeBox);
    const raffleId = winnerPrizeBuilder.getTicketTokenId();
    const winnerIndex = winnerPrizeBuilder.getWinnerIndex();
    const winnerTicketIndex = winnerPrizeBuilder.getWinnerTicketIndex();

    this.logger.info(
      `Processing gift unwrap for winner prize box [${winnerPrizeBox.boxId}] with raffle id [${raffleId}] and winner index [${winnerIndex}]`,
    );

    // Find the required gift boxes for this winner from database
    const gifts = convertDbBoxesToErgoBoxes(
      await DbService.getInstance().getGifts(raffleId, winnerIndex),
    );

    this.logger.info(
      `Found [${gifts.length}] unspent gift boxes for raffle [${raffleId}] and winner index [${winnerIndex}], creating gift unwrap transactions`,
    );

    // Find the ticket box with the winner ticket index from database
    const ticketBoxEntity = (
      await DbService.getInstance().getTickets(raffleId, winnerTicketIndex)
    )[0];
    if (!ticketBoxEntity) {
      this.logger.error(
        `Impossible case: Ticket box not found for raffle [${raffleId}] and winner ticket index [${winnerTicketIndex}], skipping gift unwrap`,
      );
      return;
    }
    const winnerAddress = ticketBoxEntity?.donatorErgoTree;
    const ticketBox = convertDbBoxesToErgoBoxes([ticketBoxEntity])[0];

    let currentWinnerPrize = winnerPrizeBox;

    // Process each gift box
    for (const gift of gifts) {
      this.logger.debug(
        `Creating gift unwrap transaction for winner prize [${currentWinnerPrize.boxId}] and gift box [${gift.boxId}]`,
      );

      // Build the gift unwrap transaction
      const giftUnwrapTxBuilder = new GiftUnwrapTxBuilder()
        .setWinnerPrize(winnerPrizeBox)
        .setGiftForWinner(gift)
        .setTicket(ticketBox)
        .setWinnerErgoTree(winnerAddress)
        .setChainHeight(await this.network.getHeight())
        .setTxFee(getConfig().ergo.fee);

      const giftUnwrapTx = giftUnwrapTxBuilder.build();

      const signedGiftUnwrapTx = await signAndAddTx(
        this.network,
        giftUnwrapTx,
        TxType.GiftUnwrap,
      );

      this.logger.info(
        `Gift unwrap transaction for gift box [${gift.boxId}] has been added (txId: [${giftUnwrapTx.id}])`,
      );
      currentWinnerPrize = new ErgoBox(signedGiftUnwrapTx.outputs[0]);
    }

    this.logger.info(
      `Gift unwrap transactions for winner [${winnerIndex}] are completely executed`,
    );
    // Build the final prize transaction
    const finalPrizeTxBuilder = new FinalPrizeTxBuilder()
      .setWinnerPrize(currentWinnerPrize)
      .setTicket(ticketBox)
      .setWinnerErgoTree(winnerAddress)
      .setChainHeight(await this.network.getHeight())
      .setTxFee(getConfig().ergo.fee);

    const finalPrizeTx = finalPrizeTxBuilder.build();
    await signAndAddTx(this.network, finalPrizeTx, TxType.FinalPrize);

    this.logger.info(
      `Final prize transaction for winner [${winnerIndex}] has been added (txId: [${finalPrizeTx.id}])`,
    );
  };

  /**
   * Add the winner prize box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.winnerPrize,
      value: undefined,
      tokens: [],
      onSuffice: this.giftUnwrapCallback,
      getMinedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getWinnerPrizeBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
  }
}
