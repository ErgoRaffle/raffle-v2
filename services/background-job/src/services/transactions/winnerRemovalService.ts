import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { OnSufficeCallback, Request } from '../../types';
import { raffleInfo } from '@ergo-raffle/contracts';
import {
  ForwardToTicketRedeemTxBuilder,
  WinnerRemovalTxBuilder,
} from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { GiftRedeemBuilder, WinnerBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLookup';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { configs } from '../../config';
import { findAllWinners } from '../../transactions/boxFinder';

export class WinnerRemovalService extends AbstractTxService {
  name = 'WinnerRemovalService';

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
    this.instance = new WinnerRemovalService(nodeUrl, logger);
  };

  /**
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): WinnerRemovalService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as WinnerRemovalService;
  };

  /**
   * Callback for winner removal transaction
   * - Check the winners that have no gifts left
   * - Builds the winner removal transaction for each winner and chain them to each other
   * - Builds the forward to ticket redeem transaction and chains it to the last winner removal transaction
   * @param boxes - The boxes to process
   * @param unspentBoxes - The unspent boxes
   * @returns void
   */
  private winnerRemovalCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
    unspentBoxes: ErgoBox[],
  ): Promise<void> => {
    const giftRedeemBox = boxes[0];
    const giftRedeemBuilder = GiftRedeemBuilder.fromBox(giftRedeemBox);
    const raffleId = giftRedeemBuilder.getTicketTokenId();
    const step = giftRedeemBuilder.getStep();

    this.logger.info(
      `Processing winner removal for gift redeem box [${giftRedeemBox.boxId}] with raffle id [${raffleId}], step [${step}]`,
    );

    // Find the winner box for this step
    const winnerBoxes = await findAllWinners(unspentBoxes, raffleId);

    // Process each winner box
    for (let i = step; i <= giftRedeemBuilder.getWinnersCount(); i++) {
      const winnerBox = winnerBoxes.find((box) => {
        const winnerBoxBuilder = WinnerBuilder.fromBox(box);
        this.logger.debug(
          `Winner box [${box.boxId}] with index [${winnerBoxBuilder.getWinnerIndex()}] has [${winnerBoxBuilder.getGiftCount()}] gifts left`,
        );
        return (
          winnerBoxBuilder.getWinnerIndex() === i &&
          winnerBoxBuilder.getGiftCount() === 0n
        );
      });
      if (!winnerBox) {
        this.logger.debug(
          `Winner box not found with index ${i} and zero gifts, waiting for gift unwrap before winner removal transaction for gift redeem box [${giftRedeemBox.boxId}]`,
        );
        return;
      }

      this.logger.debug(
        `Creating winner removal transaction for winner box [${winnerBox.boxId}] with index [${i}]`,
      );

      // Build the winner removal transaction
      const winnerRemovalTx = new WinnerRemovalTxBuilder()
        .setGiftRedeem(giftRedeemBox)
        .setWinner(winnerBox)
        .setChainHeight(await this.network.getHeight())
        .setTxFee(configs.ergo.fee)
        .build();

      await signAndAddTx(this.network, winnerRemovalTx, TxType.WinnerRemoval);

      this.logger.info(
        `Winner removal transaction for winner [${i}] of raffle [${raffleId}] has been added (txId: [${winnerRemovalTx.id}])`,
      );
    }

    this.logger.info(
      `Winner removal transactions for all winners of raffle [${raffleId}] have been successfully executed`,
    );
    const forwardToTicketRedeemTx = new ForwardToTicketRedeemTxBuilder()
      .setGiftRedeem(giftRedeemBox)
      .setChainHeight(await this.network.getHeight())
      .setTxFee(configs.ergo.fee)
      .build();

    await signAndAddTx(
      this.network,
      forwardToTicketRedeemTx,
      TxType.ForwardToTicketRedeem,
    );

    this.logger.info(
      `Forward to ticket redeem transaction for gift redeem box [${giftRedeemBox.boxId}] has been added (txId: [${forwardToTicketRedeemTx.id}])`,
    );
  };

  /**
   * Add the gift redeem box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.giftRedeem,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.winnerRemovalCallback,
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getGiftRedeemBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
    this.logger.debug(
      `Winner removal box-lookup request added to the service (requestId: [${requestId}])`,
    );
  }
}
