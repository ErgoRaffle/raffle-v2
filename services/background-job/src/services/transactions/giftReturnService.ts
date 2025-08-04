import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { GiftReturnTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { WinnerBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { getConfig } from '../../config/config';
import { findGiftRedeemBox } from '../../transactions/boxFinder';

export class GiftReturnService extends AbstractTxService {
  name = 'GiftReturnService';

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
    this.instance = new GiftReturnService(nodeUrl, logger);
  };

  /**
   * Callback for gift return transaction
   * - Builds the gift return transaction for each gift and chains them to each other
   * Note: This callback assumes that the gift boxes are available in the database
   * @param boxes - The boxes to process
   * @returns void
   */
  private giftReturnCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const winnerBox = boxes[0];
    const winnerBuilder = WinnerBuilder.fromBox(winnerBox);
    const raffleId = winnerBuilder.getTicketTokenId();
    const winnerIndex = winnerBuilder.getWinnerIndex();
    const deadline = winnerBuilder.getDeadline();
    const currentHeight = await this.network.getHeight();

    // Check if deadline has passed
    if (currentHeight <= deadline) {
      this.logger.info(
        `Deadline for winner [${winnerIndex}] has not passed yet (current height: [${currentHeight}], deadline: [${deadline}]), skipping gift redeem`,
      );
      return;
    }

    this.logger.info(
      `Deadline for winner [${winnerIndex}] has passed (current height: [${currentHeight}], deadline: [${deadline}]), proceeding with gift redeem`,
    );

    // Find the gift redeem box
    const giftRedeemBox = await findGiftRedeemBox(undefined, raffleId);
    if (!giftRedeemBox) {
      this.logger.debug(
        `Gift redeem box not found for raffle [${raffleId}], skipping gift redeem`,
      );
      return;
    }

    // Get all gifts for this winner from database
    const giftEntites = await DbService.getInstance().getGifts(
      raffleId,
      winnerIndex,
    );
    this.logger.info(
      `Found [${giftEntites.length}] unspent gift boxes for raffle [${raffleId}] and winner index [${winnerIndex}], creating gift return transactions`,
    );
    let currentWinnerBox = winnerBox;

    // Process each gift box
    for (const giftEntity of giftEntites) {
      this.logger.debug(
        `Creating gift return transaction for winner [${winnerBox.boxId}] and gift box [${giftEntity.boxId}]`,
      );
      const donatorAddress = giftEntity.donatorErgoTree;

      // Build the gift return transaction
      const giftReturnTxBuilder = new GiftReturnTxBuilder()
        .setGiftRedeem(giftRedeemBox)
        .setWinner(winnerBox)
        .setGift(convertDbBoxesToErgoBoxes([giftEntity])[0])
        .setGiftGiverErgoTree(donatorAddress)
        .setChainHeight(currentHeight)
        .setTxFee(getConfig().ergo.fee);

      const giftReturnTx = giftReturnTxBuilder.build();

      const signedGiftReturnTx = await signAndAddTx(
        this.network,
        giftReturnTx,
        TxType.GiftReturn,
      );

      this.logger.info(
        `Gift return transaction for gift box [${giftEntity.boxId}] has been added (txId: [${giftReturnTx.id}])`,
      );
      currentWinnerBox = new ErgoBox(signedGiftReturnTx.outputs[0]);
    }

    this.logger.info(
      `Gift return transactions for winner [${winnerIndex}] are completely executed`,
    );
  };

  /**
   * Add the winner box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.winner,
      value: undefined,
      tokens: [],
      onSuffice: this.giftReturnCallback,
      getMinedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getWinnerBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
  }
}
