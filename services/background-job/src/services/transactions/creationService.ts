import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import {
  ActivationTxBuilder,
  CreationTxBuilder,
  GiftTokenReceiptTxBuilder,
} from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';

import { CreationParamsEntity } from '../../database/entities/creationParamsEntity';
import { BoxLookupService } from '../boxLoookupService';
import { ScannerService } from '../scannerService';
import { TxPotService } from '../txPotService';
import { getConfig } from '../../config/config';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
  txpotCallBackGenerator,
} from '../../transactions/utils';
import { TxType } from '../../transactions/types';
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
   * This service doesn't have any base requests
   */
  addBaseRequests(): void {
    return;
  }

  /**
   * Generator function for a raffle creation callback
   * - Build the creation transaction
   * - Build the activation transaction by chaining it to the creation transaction
   * - Build the gift receipt transactions by chaining it to the activation transaction
   * @param raffleParams - The raffle creation parameters
   * @returns A callback for the creation of a raffle
   */
  private creationCallbackGenerator = (
    raffleParams: CreationParamsEntity,
  ): OnSufficeCallback => {
    const creationCallBack = async (
      boxes: ErgoBox[],
      unspentBoxes: ErgoBox[],
      requestId: number,
    ): Promise<void> => {
      // Find the service box in unspent boxes
      let serviceBox = unspentBoxes.find(
        (box) => box.assets[0]?.tokenId === raffleInfo.tokens.serviceNft,
      );
      if (!serviceBox) {
        // Find the service box in the database
        this.logger.debug(
          `Service box not found for request id: [${requestId}], trying to find in the database`,
        );
        const serviceBoxEntity = await DbService.getInstance().getServiceBox();
        if (!serviceBoxEntity) {
          this.logger.error(
            `Service box not found for request id: [${requestId}], skipping creation`,
          );
          return;
        }
        serviceBox = convertDbBoxesToErgoBoxes([serviceBoxEntity])[0];
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
        .setWinnersSharePercent(raffleParams.winnersPercent)
        .setImplementerAddress(raffleParams.implementorAddress)
        .setCreatorAddress(raffleParams.creatorAddress)
        .setChainHeight(await this.network.getHeight())
        .setTxFee(getConfig().ergo.fee);

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
        TxType.Activation,
      );
      this.logger.info(
        `Creation transaction for request with id [${requestId}] has been added (txId: [${creationTx.id}])`,
      );

      // Build the activation transaction and chain it to the creation transaction
      const raffleId = serviceBox.boxId;
      const activationTxBuilder = new ActivationTxBuilder()
        .setInactiveRaffle(signedCreationTx.outputs[1])
        .setTicketRepo(signedCreationTx.outputs[0])
        .setTxFee(getConfig().ergo.fee)
        .setChainHeight(await this.network.getHeight())
        .setGiftTokenName('ErgoRaffle-Gift-Token-' + raffleId.slice(0, 6))
        .setGiftTokenDescription(
          'ErgoRaffle Gift token identifier to identify the gift boxes of raffle with id ' +
            raffleId,
        )
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
      for (const winnerBox of activationTx.outputs.slice(3)) {
        const giftReceiptTxBuilder = new GiftTokenReceiptTxBuilder()
          .setGiftTokenRepo(giftTokenRepo)
          .setWinner(winnerBox)
          .setTxFee(getConfig().ergo.fee)
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
      getMinedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getDynamicBoxes(
            raffleParams.proxyAddress,
          ),
        );
      },
    };
    // Register the request with the box lookup service
    const requestId =
      BoxLookupService.getInstance().addRequest(boxLookupRequest);

    // Add the txpot callback
    const callbackId = `${TxType.Creation}-${raffleParams.id}`;
    this.activeTxpotCallbackIds.push([TxType.Creation, callbackId]);
    TxPotService.getInstance().registerCompletionCallback(
      TxType.Creation,
      callbackId,
      txpotCallBackGenerator(
        this,
        raffleParams.proxyAddress,
        requestId,
        callbackId,
        TxType.Creation,
      ),
    );
  }
}
