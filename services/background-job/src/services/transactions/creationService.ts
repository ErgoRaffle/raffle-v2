import { ErgoAddress, ErgoBox, TransactionBuilder } from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import { raffleInfo } from '@ergo-raffle/contracts';
import { CreationProxyEntity } from '@ergo-raffle/extractors';
import {
  ActivationTxBuilder,
  CreationTxBuilder,
  GiftTokenReceiptTxBuilder,
} from '@ergo-raffle/transactions';

import { configs } from '../../config';
import {
  ERG_TOKEN_ID,
  GIFT_TOKEN_DESCRIPTION_PREFIX,
  GIFT_TOKEN_NAME_PREFIX,
  TICKET_TOKEN_COUNT,
  TICKET_TOKEN_DESCRIPTION_PREFIX,
  TICKET_TOKEN_NAME_PREFIX,
} from '../../constants';
import { findServiceBox } from '../../transactions/boxFinder';
import {
  convertDbBoxesToErgoBoxes,
  signAndAddTx,
} from '../../transactions/utils';
import { OnSufficeCallback, Request } from '../../types';
import { TxType } from '../../types/transaction';
import { BoxLookupService } from '../boxLookup';
import { DbService } from '../dbService';
import { AbstractTxService } from './abstractTxService';

export class CreationService extends AbstractTxService {
  name = 'CreationService';

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
    this.instance = new CreationService(nodeUrl, logger);
  };

  /**
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): CreationService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as CreationService;
  };

  /**
   * Register a box-lookup request watching all creation proxy boxes
   */
  addBaseRequests(): void {
    const boxLookupRequest: Request = {
      address: raffleInfo.addresses.creationProxy,
      // Should process all boxes with the creation proxy address
      value: undefined,
      tokens: [],
      onSuffice: this.creationCallback,
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getCreationProxyBoxes(),
        );
      },
    };

    const requestId =
      BoxLookupService.getInstance().addRequest(boxLookupRequest);
    this.activeBoxLookupRequestIds.push(requestId);
  }

  /**
   * Callback triggered when a UID group of creation proxy boxes is covering.
   * Builds the full chain: creation → activation → gift-receipt TXs.
   */
  creationCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
    unspentBoxes: ErgoBox[],
    requestId: number,
  ): Promise<void> => {
    const proxyBox = boxes[0];
    this.logger.info(`Processing creation tx for proxy box ${proxyBox.boxId}`);

    /* TODO: Optimize proxy transaction speed.
    Now we have to wait for proxy box to be confirmed to get the entity
    local/ergo/ergoraffle/raffle-v2/-/issues/128 */
    const creationProxyEntity = (
      await DbService.getInstance().getCreationProxyBoxes(proxyBox.boxId)
    )[0];
    if (!creationProxyEntity) {
      this.logger.info(
        `Creation proxy entity not found for proxy box ${proxyBox.boxId}, skipping creation transaction`,
      );
      return;
    }

    if (
      creationProxyEntity.expirationHeight < (await this.network.getHeight())
    ) {
      this.logger.info(
        `Creation proxy box ${proxyBox.boxId} has expired, redeeming proxy box and skipping creation transaction`,
      );
      await this.redeemProxy(proxyBox, creationProxyEntity);
      return;
    }

    if (!(await this.isCoveringRequest(proxyBox, creationProxyEntity))) {
      this.logger.info(
        `Proxy boxes are not covering the request, skipping creation transaction and waiting for proxy box expiration`,
      );
      return;
    }
    this.logger.debug(
      `Creation proxy box ${proxyBox.boxId} is covering the request, building creation transaction`,
    );

    const serviceBox = await findServiceBox(unspentBoxes);
    if (!serviceBox) {
      this.logger.error(
        `Service box not found, skipping creation transaction for request id [${requestId}]`,
      );
      return;
    }
    this.logger.debug(
      `Service box found with id [${serviceBox.boxId}], building creation transaction`,
    );

    const chainHeight = await this.network.getHeight();

    const creationTxBuilder = new CreationTxBuilder()
      .setServiceBox(serviceBox)
      .setFeeBoxes(boxes)
      .setRaffleName(creationProxyEntity.name)
      .setRaffleDescription(creationProxyEntity.description)
      .setRafflePictures(JSON.parse(creationProxyEntity.pictures) as string[])
      .setTicketPrice(creationProxyEntity.ticketPrice)
      .setGoal(creationProxyEntity.goal)
      .setWinnersSharePercent(BigInt(creationProxyEntity.winnersPercent))
      .setWinnersCount(creationProxyEntity.winnerCount)
      .setDeadline(BigInt(creationProxyEntity.raffleDeadline))
      .setWinnersPercent(
        creationProxyEntity.winnersPercentList.split(',').map(BigInt),
      )
      .setImplementerErgoTree(creationProxyEntity.implementerErgoTree)
      .setOrganizerErgoTree(creationProxyEntity.organizerErgoTree)
      .setInactiveRaffleValue(proxyBox.value - creationProxyEntity.txFee * 4n)
      .setChainHeight(chainHeight)
      .setTxFee(configs.ergo.fee)
      .setTicketTokenName(TICKET_TOKEN_NAME_PREFIX + creationProxyEntity.name)
      .setTicketTokenCount(TICKET_TOKEN_COUNT)
      .setTicketTokenDescription(
        TICKET_TOKEN_DESCRIPTION_PREFIX + creationProxyEntity.name,
      );

    if (creationProxyEntity.collectingTokenId !== ERG_TOKEN_ID) {
      creationTxBuilder.setCollectingTokenId(
        creationProxyEntity.collectingTokenId,
      );
    }

    const signedCreationTx = await signAndAddTx(
      this.network,
      creationTxBuilder.build(),
      TxType.Creation,
    );
    this.logger.info(
      `Creation transaction for request with id [${requestId}] has been added (txId: [${signedCreationTx.id}])`,
    );

    // Build the activation transaction chained to the creation transaction
    const raffleId = serviceBox.boxId;
    const activationTx = await signAndAddTx(
      this.network,
      new ActivationTxBuilder()
        .setInactiveRaffle(signedCreationTx.outputs[2])
        .setTicketRepo(signedCreationTx.outputs[1])
        .setTxFee(configs.ergo.fee)
        .setChainHeight(chainHeight)
        .setGiftTokenName(GIFT_TOKEN_NAME_PREFIX + raffleId.slice(0, 6))
        .setGiftTokenDescription(GIFT_TOKEN_DESCRIPTION_PREFIX + raffleId)
        .setWinnersSharePercent(
          creationProxyEntity.winnersPercentList.split(',').map(BigInt),
        )
        .build(),
      TxType.Activation,
    );
    this.logger.info(
      `Activation transaction for request with id [${requestId}] has been added (txId: [${activationTx.id}])`,
    );

    // Build the gift-receipt transactions chained to the activation transaction
    // Activation outputs: [activeRaffle, raffleDetails, giftTokenRepo, winner1, winner2, ...]
    let giftTokenRepo = activationTx.outputs[2];
    for (let step = 1; step <= creationProxyEntity.winnerCount; step++) {
      const winnerBox = activationTx.outputs[2 + step];
      const giftReceiptTx = await signAndAddTx(
        this.network,
        new GiftTokenReceiptTxBuilder()
          .setGiftTokenRepo(giftTokenRepo)
          .setWinner(winnerBox)
          .setTxFee(configs.ergo.fee)
          .setChainHeight(chainHeight)
          .build(),
        TxType.GiftTokenReceipt,
      );
      this.logger.info(
        `Gift receipt transaction [${step}/${creationProxyEntity.winnerCount}] for request with id [${requestId}] has been added (txId: [${giftReceiptTx.id}])`,
      );
      giftTokenRepo = giftReceiptTx.outputs[1];
    }
  };

  /**
   * Check if the creation proxy boxes are covering the request
   * @param boxes - The proxy boxes for this UID group
   * @param entity - The creation proxy entity
   * @returns True if the boxes cover the required value
   */
  isCoveringRequest = (box: ErgoBox, entity: CreationProxyEntity): boolean => {
    const requiredNanoErgs =
      entity.txFee * BigInt(entity.winnerCount) * 5n + entity.txFee * 10n;
    const hasEnoughValue = box.value >= requiredNanoErgs;

    this.logger.debug(
      `CreationProxy covering (ERG goal): totalValue=${box.value}, ` +
        `required>=${requiredNanoErgs}, covering=${hasEnoughValue}`,
    );
    return hasEnoughValue;
  };

  /**
   * Redeem the proxy box back to the raffle organizer
   * @param box - The proxy box to redeem
   * @param entity - The creation proxy entity
   */
  redeemProxy = async (
    box: ErgoBox,
    entity: CreationProxyEntity,
  ): Promise<void> => {
    const organizerAddress = ErgoAddress.fromErgoTree(
      entity.organizerErgoTree,
    ).toString();
    const redeemTx = new TransactionBuilder(await this.network.getHeight())
      .from([box])
      .payFee(entity.txFee)
      .sendChangeTo(organizerAddress)
      .build();
    await signAndAddTx(this.network, redeemTx, TxType.RedeemProxy);
    this.logger.info(
      `Proxy box ${box.boxId} has been redeemed to ${organizerAddress} (txId: [${redeemTx.id}])`,
    );
  };
}
