import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { OnSufficeCallback, Request } from '../../types/boxLookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ActivationTxBuilder } from '@ergo-raffle/transactions';
import { InactiveRaffleBuilder } from '@ergo-raffle/boxes';
import { ErgoBox } from '@fleet-sdk/core';
import { RaffleBoxType } from '@ergo-raffle/extractors';

import { BoxLookupService } from '../boxLookup/boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import {
  GIFT_TOKEN_DESCRIPTION_PREFIX,
  GIFT_TOKEN_NAME_PREFIX,
} from '../../constants';

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
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): ActivationService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as ActivationService;
  };

  /**
   * Generator function for an activation callback
   * - Build the activation transaction
   * Note: This callback assumes that the creation transaction has been already
   * mined and the boxes are available in the database
   * @param boxes - The boxes
   * @returns A callback for the activation of a raffle
   */
  private activationCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const inactiveRaffle = InactiveRaffleBuilder.fromBox(boxes[0]);
    this.logger.info(
      `Processing activation for inactive raffle box [${boxes[0].boxId}] with raffle id [${inactiveRaffle.getTicketId()}]`,
    );

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
    const ticketRepo = convertDbBoxesToErgoBoxes(ticketRepoEntity)[0];

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
        GIFT_TOKEN_NAME_PREFIX + raffleEntity.raffleId.slice(0, 6),
      )
      .setGiftTokenDescription(
        GIFT_TOKEN_DESCRIPTION_PREFIX + raffleEntity.raffleId,
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
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getInactiveRaffleBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
    this.logger.debug(
      `Activation box-lookup request added to the service (requestId: [${requestId}])`,
    );
  }
}
