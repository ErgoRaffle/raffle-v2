import { ErgoBox } from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import {
  ActivationTxBuilder,
  CreationTxBuilder,
  GiftTokenReceiptTxBuilder,
} from '@ergo-raffle/transactions';

import { configs } from '../../config';
import {
  GIFT_TOKEN_DESCRIPTION_PREFIX,
  GIFT_TOKEN_NAME_PREFIX,
  TICKET_TOKEN_DESCRIPTION_PREFIX,
  TICKET_TOKEN_NAME_PREFIX,
  TICKET_TOKEN_COUNT,
} from '../../constants';
import { CreationParamsEntity } from '../../database/entities';
import { findServiceBox } from '../../transactions/boxFinder';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { OnSufficeCallback, Request } from '../../types';
import { TxType } from '../../types/transaction';
import { BoxLookupService } from '../boxLookup';
import { DbService } from '../dbService';
import { ScannerService } from '../scannerService';
import { TxPotService } from '../txPotService';
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
   * This service doesn't have any base requests
   */
  addBaseRequests(): void {
    return;
  }

  /**
   * Generator function for a raffle creation callback
   * - Builds the creation transaction
   * - Builds the activation transaction by chaining it to the creation transaction
   * - Builds the gift receipt transactions by chaining it to the activation transaction
   * @param raffleParams - The raffle creation parameters
   * @returns A callback function for the creation of a raffle
   */
  private creationCallbackGenerator = (
    raffleParams: CreationParamsEntity,
  ): OnSufficeCallback => {
    const creationCallBack = async (
      boxes: ErgoBox[],
      unspentBoxes: ErgoBox[],
      requestId: number,
    ): Promise<void> => {
      const serviceBox = await findServiceBox(unspentBoxes);
      if (!serviceBox) {
        this.logger.error(
          `Service box not found for request id: [${requestId}], skipping raffle creation`,
        );
        return;
      }
      this.logger.debug(
        `Service box found with id [${serviceBox.boxId}], building creation transaction`,
      );

      const creationTxBuilder = new CreationTxBuilder()
        .setServiceBox(serviceBox)
        .setFeeBoxes(boxes)
        .setRaffleName(raffleParams.name)
        .setRaffleDescription(raffleParams.description)
        .setRafflePictures(
          raffleParams.pictures
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((picture) => picture.content),
        )
        .setTicketPrice(raffleParams.ticketPrice)
        .setGoal(raffleParams.goal)
        .setWinnersSharePercent(BigInt(raffleParams.winnersPercent))
        .setWinnersCount(raffleParams.winnerCount)
        .setDeadline(BigInt(raffleParams.deadline))
        .setWinnersPercent(
          raffleParams.winnersPercentList.split(',').map(BigInt),
        )
        .setImplementerAddress(raffleParams.implementorAddress)
        .setCreatorAddress(raffleParams.creatorAddress)
        .setInactiveRaffleValue(
          raffleParams.requiredValue - configs.ergo.fee * 4n,
        )
        .setChainHeight(await this.network.getHeight())
        .setTxFee(configs.ergo.fee)
        .setTicketTokenName(TICKET_TOKEN_NAME_PREFIX + raffleParams.name)
        .setTicketTokenCount(TICKET_TOKEN_COUNT)
        .setTicketTokenDescription(
          TICKET_TOKEN_DESCRIPTION_PREFIX + raffleParams.name,
        );

      if (raffleParams.collectingTokenId) {
        this.logger.debug(
          `Collecting token id is set, creating a token-goal raffle with token [${raffleParams.collectingTokenId}]`,
        );
        creationTxBuilder.setCollectingTokenId(raffleParams.collectingTokenId);
      }
      const creationTx = creationTxBuilder.build();

      const signedCreationTx = await signAndAddTx(
        this.network,
        creationTx,
        TxType.Creation,
      );
      this.logger.info(
        `Creation transaction for request with id [${requestId}] has been added (txId: [${creationTx.id}])`,
      );

      // Add the txpot callback
      const callbackId = `${TxType.Creation}-${raffleParams.id}`;
      this.activeTxpotCallbackIds.push([TxType.Creation, callbackId]);
      TxPotService.getInstance().registerCompletionCallback(
        TxType.Creation,
        callbackId,
        this.txpotCallBackGenerator(
          creationTx.id,
          requestId,
          callbackId,
          TxType.Creation,
          raffleParams.proxyAddress,
        ),
      );
      this.logger.debug(
        `Completion callback added to txpot with callback id [${callbackId}] for transaction [${creationTx.id}]`,
      );

      // Build the activation transaction and chain it to the creation transaction
      const raffleId = serviceBox.boxId;
      const activationTxBuilder = new ActivationTxBuilder()
        .setInactiveRaffle(signedCreationTx.outputs[2])
        .setTicketRepo(signedCreationTx.outputs[1])
        .setTxFee(configs.ergo.fee)
        .setChainHeight(await this.network.getHeight())
        .setGiftTokenName(GIFT_TOKEN_NAME_PREFIX + raffleId.slice(0, 6))
        .setGiftTokenDescription(GIFT_TOKEN_DESCRIPTION_PREFIX + raffleId)
        .setWinnersSharePercent(
          raffleParams.winnersPercentList.split(',').map(BigInt),
        );

      const activationTx = await signAndAddTx(
        this.network,
        activationTxBuilder.build(),
        TxType.Activation,
      );
      this.logger.info(
        `Activation transaction for request with id [${requestId}] has been added (txId: [${activationTx.id}])`,
      );

      // Build the gift receipt transactions by chaining it to the activation transaction
      let giftTokenRepo = activationTx.outputs[2];
      let step = 1;
      for (const winnerBox of activationTx.outputs.slice(
        3,
        3 + raffleParams.winnerCount,
      )) {
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
          `Gift receipt transaction for request with id [${requestId}] has been added (txId: [${giftReceiptTx.id}]) for step [${step}]`,
        );
        giftTokenRepo = giftReceiptTx.outputs[1];
        step++;
      }
    };
    return creationCallBack;
  };

  /**
   * Create a raffle creation request and register it with the box lookup service
   * @param raffleParams - The raffle creation parameters
   * @returns The request id
   */
  public createRaffle(raffleParams: CreationParamsEntity): void {
    // Add the proxy address to the scanner
    ScannerService.getInstance().addDynamicAddress(raffleParams.proxyAddress);

    // Build the box lookup request
    const boxLookupRequest: Request = {
      address: raffleParams.proxyAddress,
      value: raffleParams.requiredValue,
      tokens: raffleParams.requiredTokenId
        ? [{ tokenId: raffleParams.requiredTokenId, amount: 1n }]
        : [],
      onSuffice: this.creationCallbackGenerator(raffleParams),
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getDynamicBoxes(
            raffleParams.proxyAddress,
          ),
        );
      },
    };
    // Register the request with the box lookup service
    BoxLookupService.getInstance().addRequest(boxLookupRequest);
  }
}
