import { OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { InactiveRaffleBuilder } from '@ergo-raffle/boxes/lib/builders/inactiveRaffleBuilder';
import { ErgoBox } from '@fleet-sdk/core';
import {
  ActivationTxBuilder,
  CreationTxBuilder,
} from '@ergo-raffle/transactions';
import { TxPot } from '@rosen-bridge/tx-pot';
import { RaffleBoxType } from '@ergo-raffle/extractors/lib/entities/RaffleBoxEntity';
import { DummyLogger, AbstractLogger } from '@rosen-bridge/abstract-logger';
import { raffleInfo } from '@ergo-raffle/contracts';

import { DbService } from '../services/dbService';
import { covertDbBoxesToErgoBoxes, signAndAddTx } from './utils';
import ErgoNodeNetwork from '../network/ErgoNodeNetwork';
import { TxType } from '../txPot/types';
import { BoxLookupService } from '../services/boxLoookupService';
import { CreationRequestEntity } from '../database/entities';
import { getConfig } from '../config/config';

export class BoxLookupCallbacks {
  constructor(
    private readonly network: ErgoNodeNetwork,
    private readonly txPot: TxPot,
    private readonly logger: AbstractLogger = new DummyLogger(),
  ) {}

  /**
   * Generator function for a raffle creation callback
   * @param request - The creation request
   * @returns A callback for the creation of a raffle
   */
  creationCallbackGenerator = (
    request: CreationRequestEntity,
  ): OnSufficeCallback => {
    /**
     * Callback for the creation of a raffle
     * @param boxes
     * @param unspentBoxes
     * @param requestId
     */
    const creationCallBack = async (
      boxes: ErgoBox[],
      unspentBoxes: ErgoBox[],
      requestId: number,
    ): Promise<void> => {
      // Find the service box in unspent boxes
      let serviceBox = unspentBoxes.find(
        (box) => box.assets[0].tokenId === raffleInfo.tokens.serviceNft,
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
        .setRaffleName(request.name)
        .setRaffleDescription(request.description)
        .setRafflePictures([]) // TODO: Add pics to request
        .setTicketPrice(request.ticketPrice)
        .setGoal(request.goal)
        .setWinnersSharePercent(request.winnersPercent)
        .setImplementerAddress(request.implementorAddress)
        .setCreatorAddress(request.creatorAddress)
        .setChainHeight(await this.network.getHeight())
        .setTxFee(getConfig().ergo.fee);

      if (request.collectingTokenId)
        creationTxBuilder.setCollectingTokenId(request.collectingTokenId);
      const creationTx = creationTxBuilder.build();

      await signAndAddTx(
        this.network,
        this.txPot,
        creationTx,
        TxType.Activation,
      );
      this.logger.info(
        `Creation transaction for request with id [${requestId}] has been added (txId: [${creationTx.id}])`,
      );
      // Remove the request
      BoxLookupService.getInstance().removeRequest(requestId);
    };

    return creationCallBack;
  };

  /**
   * Callback for the activation of an inactive raffle
   * Note: We assume that the creation transaction has been mined and
   * the raffle entity and ticket repo box are available in the database
   * @param boxes - Contains one inactive raffle box
   * @param unspentBoxes - Current unspent boxes in the mempool/txpot
   */
  activationCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const inactiveRaffle = InactiveRaffleBuilder.fromBox(boxes[0]);

    // Get raffle entity from the database
    const raffleEntity = await DbService.getInstance().getRaffleData(
      inactiveRaffle.getTicketId(),
    );
    if (!raffleEntity) {
      this.logger.warn(
        `Raffle entity not found for raffle id: [${inactiveRaffle.getTicketId()}], skipping activation`,
      );
      return;
    }

    // Find ticket repo box from the database
    const ticketRepoEntity = await DbService.getInstance().getRaffleBoxes(
      inactiveRaffle.getTicketId(),
      RaffleBoxType.TicketRepo,
    );
    if (ticketRepoEntity.length === 0) {
      this.logger.error(
        `Impossible case: Ticket repo not found for raffle id: [${inactiveRaffle.getTicketId()}], skipping activation`,
      );
      return;
    }
    const ticketRepo = covertDbBoxesToErgoBoxes(ticketRepoEntity)[0];

    // Get winners share percent from raffle entity
    const winnersSharePercent = raffleEntity.winnersPercentList
      .split(',')
      .map(BigInt);

    const activationTx = new ActivationTxBuilder()
      .setInactiveRaffle(boxes[0])
      .setTicketRepo(ticketRepo)
      .setTxFee(inactiveRaffle.getTxFee())
      .setChainHeight(await this.network.getHeight())
      .setGiftTokenName(
        'ErgoRaffle-Gift-Token-' + raffleEntity.raffleId.slice(0, 6),
      )
      .setGiftTokenDescription(
        'ErgoRaffle Gift token identifier to identify the gift boxes of raffle with id ' +
          raffleEntity.raffleId,
      )
      .setWinnersSharePercent(winnersSharePercent)
      .build();

    await signAndAddTx(
      this.network,
      this.txPot,
      activationTx,
      TxType.Activation,
    );
    this.logger.info(
      `Activation transaction for raffle id [${inactiveRaffle.getTicketId()}] has been added (txId: [${activationTx.id}])`,
    );
  };
}
