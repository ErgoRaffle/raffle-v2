import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import {
  ActivationTxBuilder,
  CreationTxBuilder,
} from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';

import { CreationParamsEntity } from '../../database/entities/creationParamsEntity';
import { BoxLookupService } from '../boxLoookupService';
import { ScannerService } from '../scannerService';
import { TxPotService } from '../txPotService';
import { getConfig } from '../../config/config';
import {
  signAndAddTx,
  covertDbBoxesToErgoBoxes,
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
        serviceBox = covertDbBoxesToErgoBoxes([serviceBoxEntity])[0];
      }
      const creationTxBuilder = new CreationTxBuilder()
        .setServiceBox(serviceBox)
        .setFeeBoxes(boxes)
        .setRaffleName(raffleParams.name)
        .setRaffleDescription(raffleParams.description)
        .setRafflePictures([]) // TODO: Add pics to params
        .setTicketPrice(raffleParams.ticketPrice)
        .setGoal(raffleParams.goal)
        .setWinnersSharePercent(raffleParams.winnersPercent)
        .setImplementerAddress(raffleParams.implementorAddress)
        .setCreatorAddress(raffleParams.creatorAddress)
        .setChainHeight(await this.network.getHeight())
        .setTxFee(getConfig().ergo.fee);

      if (raffleParams.collectingTokenId)
        creationTxBuilder.setCollectingTokenId(raffleParams.collectingTokenId);
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
      const activationTx = new ActivationTxBuilder()
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
        )
        .build();

      await signAndAddTx(this.network, activationTx, TxType.Activation);
      this.logger.info(
        `Activation transaction for request with id [${requestId}] has been added (txId: [${activationTx.id}])`,
      );
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
      value: 0, // TODO: Add value to request
      tokens: [], // TODO: Add tokens to request
      onSuffice: this.creationCallbackGenerator(raffleParams),
      getMinedBoxes: async () => {
        return covertDbBoxesToErgoBoxes(
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
