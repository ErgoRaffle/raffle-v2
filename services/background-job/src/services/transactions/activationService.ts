import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ActivationTxBuilder } from '@ergo-raffle/transactions';
import { InactiveRaffleBuilder } from '@ergo-raffle/boxes';
import { ErgoBox } from '@fleet-sdk/core';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  covertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../transactions/types';
import { RaffleBoxType } from '@ergo-raffle/extractors/lib/entities/raffleBoxEntity';
import { AbstractTxService } from './abstractTxService';

export class ActivationService extends AbstractTxService {
  name = 'ActivationService';

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
    this.instance = new ActivationService(nodeUrl, logger);
  };

  /**
   * Callback for activation transaction
   */
  private activationCallback: OnSufficeCallback = async (
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

    await signAndAddTx(this.network, activationTx, TxType.Activation);
    this.logger.info(
      `Activation transaction for raffle id [${inactiveRaffle.getTicketId()}] has been added (txId: [${activationTx.id}])`,
    );
  };

  /**
   * Add the activation box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.inactiveRaffle,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.activationCallback,
      getMinedBoxes: async () => {
        return covertDbBoxesToErgoBoxes(
          await DbService.getInstance().getInactiveRaffleBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
  }
}
