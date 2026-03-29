import { ErgoBox, TransactionBuilder } from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import { raffleInfo } from '@ergo-raffle/contracts';
import { DonationProxyEntity } from '@ergo-raffle/extractors';
import { DonateTxBuilder } from '@ergo-raffle/transactions';

import { configs } from '../../config';
import { findActiveRaffle } from '../../transactions/boxFinder';
import {
  convertDbBoxesToErgoBoxes,
  signAndAddTx,
} from '../../transactions/utils';
import { OnSufficeCallback, Request } from '../../types';
import { TxType } from '../../types/transaction';
import { BoxLookupService } from '../boxLookup';
import { DbService } from '../dbService';
import { AbstractTxService } from './abstractTxService';

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
    // Build the box lookup request
    const boxLookupRequest: Request = {
      address: raffleInfo.addresses.donationProxy,
      // Should process all boxes with the donation proxy address
      value: undefined,
      tokens: [],
      onSuffice: this.donationCallback,
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getDonationProxyBoxes(),
        );
      },
    };

    // Register the request with the box lookup service
    const requestId =
      BoxLookupService.getInstance().addRequest(boxLookupRequest);
    this.activeBoxLookupRequestIds.push(requestId);
  }

  /**
   * Check if the donation proxy box is covering the request
   * @param box - The box to be used for the donation transaction
   * @param donationProxyEntity - The donation proxy entity
   * @returns True if the donation proxy box is covering the request, false otherwise
   */
  isCoveringRequest = async (
    box: ErgoBox,
    donationProxyEntity: DonationProxyEntity,
  ): Promise<boolean> => {
    const raffleData = await await DbService.getInstance().getRaffleData(
      donationProxyEntity.raffleId,
    );
    if (!raffleData) {
      this.logger.warn(
        `DonationProxy covering: no raffle exists with raffleId=${donationProxyEntity.raffleId}`,
      );
      return false;
    }

    const ticketPrice = BigInt(raffleData.ticketPrice);

    const totalValue = box.value;

    if (raffleData.collectingTokenId) {
      const requiredErg = donationProxyEntity.txFee * 4n;
      const requiredTokens =
        ticketPrice * BigInt(donationProxyEntity.ticketCount);
      const hasEnoughErg = totalValue >= requiredErg;

      const tokenTotal = box.assets
        .filter((a) => a.tokenId === raffleData.collectingTokenId)
        .reduce((s, a) => s + BigInt(a.amount), 0n);
      const hasEnoughTokens = tokenTotal >= requiredTokens;
      const covering = hasEnoughErg && hasEnoughTokens;

      this.logger.debug(
        `DonationProxy covering (token goal): raffleId=${donationProxyEntity.raffleId}, ` +
          `totalErg=${totalValue}, requiredErg>=${requiredErg}, ` +
          `collectingToken=${raffleData.collectingTokenId}, tokenTotal=${tokenTotal}, ` +
          `requiredTokens>=${requiredTokens}, covering=${covering}`,
      );
      return covering;
    } else {
      const requiredErg =
        ticketPrice * BigInt(donationProxyEntity.ticketCount) +
        donationProxyEntity.txFee * 4n;
      const covering = totalValue >= requiredErg;
      this.logger.debug(
        `DonationProxy covering (ERG goal): raffleId=${donationProxyEntity.raffleId}, ` +
          `totalErg=${totalValue}, requiredErg>=${requiredErg}, covering=${covering}`,
      );
      return covering;
    }
  };

  /**
   * Redeem the proxy box
   * @param proxyBox - The proxy box to be redeemed
   * @param donationProxyEntity - The donation proxy entity
   * @returns The void
   */
  redeemProxy = async (
    proxyBox: ErgoBox,
    donationProxyEntity: DonationProxyEntity,
  ): Promise<void> => {
    const redeemTx = new TransactionBuilder(await this.network.getHeight())
      .from([proxyBox])
      .payFee(donationProxyEntity.txFee)
      .sendChangeTo(donationProxyEntity.address)
      .build();
    await signAndAddTx(this.network, redeemTx, TxType.RedeemProxy);
    this.logger.info(
      `Proxy box ${proxyBox.boxId} has been redeemed to ${donationProxyEntity.address} (txId: [${redeemTx.id}])`,
    );
  };

  /**
   * Callback function for the donation transaction
   * @param boxes - The boxes to be used for the donation transaction
   * @param unspentBoxes - The unspent boxes to be used for the donation transaction
   * @param requestId - The request id
   * @returns The donation transaction
   */
  donationCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
    unspentBoxes: ErgoBox[],
    requestId: number,
  ): Promise<void> => {
    const proxyBox = boxes[0];
    this.logger.info(`Processing donation tx for proxy box ${proxyBox.boxId}`);

    /* TODO: Optimize proxy transaction speed.
    Now we have to wait for proxy box to be confirmed to get the entity
    local/ergo/ergoraffle/raffle-v2/-/issues/125 */
    const donationProxyEntity = (
      await DbService.getInstance().getDonationProxyBoxes(proxyBox.boxId)
    )[0];
    if (!donationProxyEntity) {
      this.logger.info(
        `Donation proxy entity not found for proxy box ${proxyBox.boxId}, skipping donation transaction`,
      );
      return;
    }

    if (
      donationProxyEntity.expirationHeight < (await this.network.getHeight())
    ) {
      this.logger.info(
        `Donation proxy box ${proxyBox.boxId} has expired, redeeming proxy box and skipping donation transaction`,
      );
      await this.redeemProxy(proxyBox, donationProxyEntity);
      return;
    }

    if (!(await this.isCoveringRequest(proxyBox, donationProxyEntity))) {
      this.logger.info(
        `Proxy box ${proxyBox.boxId} is not covering the request, skipping donation transaction and waiting for proxy box expiration`,
      );
      return;
    }
    this.logger.debug(
      `Donation proxy box ${proxyBox.boxId} is covering the request, building donation transaction`,
    );

    // Find the active raffle box
    const activeRaffleBox = await findActiveRaffle(
      unspentBoxes,
      donationProxyEntity.raffleId,
    );
    if (!activeRaffleBox) {
      this.logger.warn(
        `Active raffle box not found, skipping donation transaction for raffle ${donationProxyEntity.raffleId} (request id: [${requestId}])`,
      );
      return;
    }

    this.logger.info(
      `Active raffle box found with id [${activeRaffleBox.boxId}], building donation transaction`,
    );

    const donateTx = new DonateTxBuilder()
      .setActiveRaffle(activeRaffleBox)
      .setDonatorUtxos([proxyBox])
      .setDonatorAddress(donationProxyEntity.address)
      .setDonationTicketCount(BigInt(donationProxyEntity.ticketCount))
      .setChainHeight(await this.network.getHeight())
      .setTxFee(configs.ergo.fee)
      .build();

    await signAndAddTx(this.network, donateTx, TxType.Donation);

    this.logger.info(
      `Donation transaction for request with id [${requestId}] has been added (txId: [${donateTx.id}])`,
    );
  };
}
