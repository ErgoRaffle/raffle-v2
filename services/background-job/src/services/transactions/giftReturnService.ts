import { WinnerBuilder } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import { GiftReturnTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import { configs } from '../../config';
import { findGiftRedeemBox } from '../../transactions/boxFinder';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { OnSufficeCallback, Request } from '../../types';
import { TxType } from '../../types/transaction';
import { BoxLookupService } from '../boxLookup';
import { DbService } from '../dbService';
import { AbstractTxService } from './abstractTxService';

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
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): GiftReturnService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as GiftReturnService;
  };

  /**
   * Callback for gift return transaction
   * - Builds the gift return transaction for each gift and chains them to each other
   * Note: This callback assumes that the gift boxes are available in the database
   * @param boxes - The boxes to process
   * @param unspentBoxes - The unspent boxes available for the transaction
   * @returns Promise<void>
   */
  private giftReturnCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
    unspentBoxes: ErgoBox[],
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

    // Find the gift redeem box to check if the raffle failed
    const giftRedeemBox = await findGiftRedeemBox(unspentBoxes, raffleId);
    if (!giftRedeemBox) {
      this.logger.debug(
        `Gift redeem box not found for raffle [${raffleId}], skipping gift redeem`,
      );
      return;
    }

    this.logger.info(
      `Deadline for winner [${winnerIndex}] has passed (current height: [${currentHeight}], deadline: [${deadline}]), proceeding with gift redeem`,
    );

    // Get all gifts for this winner from database
    const giftEntities = await DbService.getInstance().getGifts(
      raffleId,
      winnerIndex,
    );
    if (giftEntities.length === 0) {
      this.logger.info(
        `No unspent gift boxes found for raffle [${raffleId}] and winner index [${winnerIndex}], skipping gift redeem`,
      );
      return;
    }
    this.logger.info(
      `Found [${giftEntities.length}] unspent gift boxes for raffle [${raffleId}] and winner index [${winnerIndex}], creating gift return transactions`,
    );

    let currentWinnerBox = winnerBox;

    // Process each gift box
    for (const giftEntity of giftEntities) {
      this.logger.debug(
        `Creating gift return transaction for winner [${winnerBox.boxId}] and gift box [${giftEntity.boxId}]`,
      );
      const donatorAddress = giftEntity.donatorErgoTree;

      // Build the gift return transaction
      const giftReturnTxBuilder = new GiftReturnTxBuilder()
        .setGiftRedeem(giftRedeemBox)
        .setWinner(currentWinnerBox)
        .setGift(convertDbBoxesToErgoBoxes([giftEntity])[0])
        .setGiftGiverErgoTree(donatorAddress)
        .setChainHeight(currentHeight)
        .setTxFee(configs.ergo.fee);

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
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getWinnerBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
    this.logger.debug(
      `Gift return box-lookup request added to the service (requestId: [${requestId}])`,
    );
  }
}
