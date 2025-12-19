import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import type { OnSufficeCallback, Request } from '../../types/boxLookup';
import { DonateTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';

import { DonationParamsEntity } from '../../database/entities';
import { BoxLookupService } from '../boxLoookupService';
import { ScannerService } from '../scannerService';
import { TxPotService } from '../txPotService';
import { configs } from '../../config';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { DbService } from '../dbService';
import { AbstractTxService } from './abstractTxService';
import { findActiveRaffle } from '../../transactions/boxFinder';

export class DonationService extends AbstractTxService {
  name = 'DonationService';

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
    this.instance = new DonationService(nodeUrl, logger);
  };

  /**
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): DonationService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as DonationService;
  };

  /**
   * This service doesn't have any base requests
   */
  addBaseRequests(): void {
    return;
  }

  /**
   * Generator function for a donation callback
   * - Finds the active raffle box for the raffle
   * - Calculates the donation value based on ticket count and ticket price
   * - Builds the donation transaction
   * @param donationParams - The donation parameters
   * @returns A callback function for donation
   */
  private donationCallbackGenerator = (
    donationParams: DonationParamsEntity,
  ): OnSufficeCallback => {
    const donationCallback = async (
      boxes: ErgoBox[],
      unspentBoxes: ErgoBox[],
      requestId: number,
    ): Promise<void> => {
      this.logger.info(
        `Processing donation tx for raffle ${donationParams.raffleId} with ${donationParams.ticketCount} tickets`,
      );

      // Find the active raffle box
      const activeRaffleBox = await findActiveRaffle(
        unspentBoxes,
        donationParams.raffleId,
      );
      if (!activeRaffleBox) {
        this.logger.warn(
          `Active raffle box not found, skipping donation transaction for raffle ${donationParams.raffleId} (request id: [${requestId}])`,
        );
        return;
      }

      this.logger.info(
        `Active raffle box found with id [${activeRaffleBox.boxId}], building donation transaction`,
      );

      const donateTx = new DonateTxBuilder()
        .setActiveRaffle(activeRaffleBox)
        .setDonatorUtxos(boxes)
        .setDonatorAddress(donationParams.donatorAddress)
        .setDonationTicketCount(BigInt(donationParams.ticketCount))
        .setChainHeight(await this.network.getHeight())
        .setTxFee(configs.ergo.fee)
        .build();

      await signAndAddTx(this.network, donateTx, TxType.Donation);

      this.logger.info(
        `Donation transaction for request with id [${requestId}] has been added (txId: [${donateTx.id}])`,
      );

      // Add the txpot callback
      const callbackId = `${TxType.Donation}-${donationParams.id}`;
      this.activeTxpotCallbackIds.push([TxType.Donation, callbackId]);
      TxPotService.getInstance().registerCompletionCallback(
        TxType.Donation,
        callbackId,
        this.txpotCallBackGenerator(
          donateTx.id,
          requestId,
          callbackId,
          TxType.Donation,
          donationParams.proxyAddress,
        ),
      );
    };
    return donationCallback;
  };

  /**
   * Create a donation request and register it with the box lookup service
   * @param donationParams - The donation parameters
   */
  public donate(donationParams: DonationParamsEntity): void {
    // Add the proxy address to the scanner
    ScannerService.getInstance().addDynamicAddress(donationParams.proxyAddress);

    // Build the box lookup request
    const boxLookupRequest: Request = {
      address: donationParams.proxyAddress,
      value: donationParams.requiredValue,
      tokens: donationParams.collectingTokenId
        ? [
            {
              tokenId: donationParams.collectingTokenId,
              amount: donationParams.collectingTokenAmount!,
            },
          ]
        : [],
      onSuffice: this.donationCallbackGenerator(donationParams),
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getDynamicBoxes(
            donationParams.proxyAddress,
          ),
        );
      },
    };

    // Register the request with the box lookup service
    const requestId =
      BoxLookupService.getInstance().addRequest(boxLookupRequest);
    this.activeBoxLookupRequestIds.push(requestId);
  }
}
