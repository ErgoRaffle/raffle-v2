import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ReturnRaffleLicenseTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { SuccessRaffleBuilder, TicketRedeemBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { configs } from '../../config';
import { findServiceBox } from '../../transactions/boxFinder';

/**
 * Enum for raffle box types used in license redeem service
 */
enum EndedRaffleBoxType {
  SuccessRaffle = 'success raffle',
  TicketRedeem = 'ticket redeem',
}

export class LicenseRedeemService extends AbstractTxService {
  name = 'LicenseRedeemService';

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
    this.instance = new LicenseRedeemService(nodeUrl, logger);
  };

  /**
   * Validation function for success raffle completion
   * Checks if all winners have been processed (step > winnerCount)
   * @param box - The success raffle box to validate
   * @returns Object with completion status and raffle information
   */
  private validateSuccessRaffleCompletion = (
    box: ErgoBox,
  ): {
    isCompleted: boolean;
    raffleId: string;
    boxType: EndedRaffleBoxType;
    details: string;
  } => {
    const successRaffleBuilder = SuccessRaffleBuilder.fromBox(box);
    const step = successRaffleBuilder.getStep();
    const winnerCount = successRaffleBuilder.getWinnerCount();
    const raffleId = successRaffleBuilder.getTicketTokenId();
    const isCompleted = step > winnerCount;

    return {
      isCompleted,
      raffleId,
      boxType: EndedRaffleBoxType.SuccessRaffle,
      details: `step [${step}] and winner count [${winnerCount}]`,
    };
  };

  /**
   * Validation function for ticket redeem completion
   * Checks if all tickets have been redeemed (redeemedTickets >= totalSoldTickets)
   * @param box - The ticket redeem box to validate
   * @returns Object with completion status and raffle information
   */
  private validateTicketRedeemCompletion = (
    box: ErgoBox,
  ): {
    isCompleted: boolean;
    raffleId: string;
    boxType: EndedRaffleBoxType;
    details: string;
  } => {
    const ticketRedeemBuilder = TicketRedeemBuilder.fromBox(box);
    const redeemedTickets = ticketRedeemBuilder.getRedeemedTickets();
    const totalSoldTickets = ticketRedeemBuilder.getTotalSoldTickets();
    const raffleId = ticketRedeemBuilder.getTicketTokenId();
    const isCompleted = redeemedTickets >= totalSoldTickets;

    return {
      isCompleted,
      raffleId,
      boxType: EndedRaffleBoxType.TicketRedeem,
      details: `redeemed tickets [${redeemedTickets}] and total sold tickets [${totalSoldTickets}]`,
    };
  };

  /**
   * Get the appropriate change address based on box type
   * @param raffleId - The raffle ID
   * @param boxType - The type of box
   * @returns The appropriate ergo tree for change
   */
  private getChangeErgoTree = async (
    raffleId: string,
    boxType: EndedRaffleBoxType,
  ): Promise<string> => {
    const raffleData = await DbService.getInstance().getRaffleData(raffleId);
    if (!raffleData) {
      throw new Error(`Raffle data not found for raffle [${raffleId}]`);
    }

    // Return appropriate ergo tree based on box type
    return boxType === EndedRaffleBoxType.SuccessRaffle
      ? raffleData.creatorErgoTree
      : raffleData.serviceErgoTree;
  };

  /**
   * Generator function that creates a callback with a validation function
   * @param validationFn - Function to validate completion conditions
   * @returns OnSufficeCallback function
   */
  private createLicenseRedeemCallback = (
    validationFn: (box: ErgoBox) => {
      isCompleted: boolean;
      raffleId: string;
      boxType: EndedRaffleBoxType;
      details: string;
    },
  ): OnSufficeCallback => {
    return async (boxes: ErgoBox[], unspentBoxes: ErgoBox[]): Promise<void> => {
      const box = boxes[0];
      const currentHeight = await this.network.getHeight();

      // Validate the box using the provided validation function
      const validation = validationFn(box);

      this.logger.debug(
        `Processing license redeem for ${validation.boxType} box [${box.boxId}] for raffle [${validation.raffleId}] with ${validation.details}`,
      );

      if (!validation.isCompleted) {
        this.logger.debug(
          `${validation.boxType} box [${box.boxId}] for raffle [${validation.raffleId}] has not reached completion condition, skipping license redeem`,
        );
        return;
      }

      this.logger.info(
        `${validation.boxType} box [${box.boxId}] for raffle [${validation.raffleId}] has reached completion condition, proceeding with license redeem`,
      );

      // Get the service box from database
      const serviceBox = await findServiceBox(unspentBoxes);
      if (!serviceBox) {
        this.logger.error(
          `Service box not found, cannot proceed with license redeem for raffle [${validation.raffleId}]`,
        );
        return;
      }

      this.logger.debug(
        `Creating license return transaction for ${validation.boxType} box [${box.boxId}] and service box [${serviceBox.boxId}]`,
      );

      // Build the license return transaction
      const returnLicenseTxBuilder = new ReturnRaffleLicenseTxBuilder()
        .setEndedRaffle(box)
        .setService(serviceBox)
        .setChangeErgoTree(
          await this.getChangeErgoTree(validation.raffleId, validation.boxType),
        )
        .setChainHeight(currentHeight)
        .setTxFee(configs.ergo.fee);

      const returnLicenseTx = returnLicenseTxBuilder.build();

      await signAndAddTx(
        this.network,
        returnLicenseTx,
        TxType.ReturnRaffleLicense,
      );

      this.logger.info(
        `License return transaction for ${validation.boxType} box [${box.boxId}] has been added (txId: [${returnLicenseTx.id}])`,
      );
    };
  };

  /**
   * Add the success raffle and ticket redeem box-lookup requests to the service
   */
  addBaseRequests(): void {
    // Success raffle request
    const successRaffleRequest: Request = {
      address: raffleInfo.addresses.successRaffle,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.createLicenseRedeemCallback(
        this.validateSuccessRaffleCompletion,
      ),
      getMinedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getSuccessRaffleBoxes(),
        );
      },
    };

    // Ticket redeem request
    const ticketRedeemRequest: Request = {
      address: raffleInfo.addresses.ticketRedeem,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.createLicenseRedeemCallback(
        this.validateTicketRedeemCompletion,
      ),
      getMinedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getTicketRedeemBoxes(),
        );
      },
    };

    const successRaffleRequestId =
      BoxLookupService.getInstance().addRequest(successRaffleRequest);
    const ticketRedeemRequestId =
      BoxLookupService.getInstance().addRequest(ticketRedeemRequest);

    this.activeBoxLookupRequestIds.push(successRaffleRequestId);
    this.activeBoxLookupRequestIds.push(ticketRedeemRequestId);
  }
}
