import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import type { OnSufficeCallback, Request } from '../../types/boxLookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { TicketRedeemTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { TicketRedeemBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { configs } from '../../config';

export class TicketRedeemService extends AbstractTxService {
  name = 'TicketRedeemService';

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
    this.instance = new TicketRedeemService(nodeUrl, logger);
  };

  /**
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): TicketRedeemService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as TicketRedeemService;
  };

  /**
   * Callback for ticket redeem transaction
   * - Builds the ticket redeem transaction for each ticket and chains them to each other
   * Note: This callback assumes that the ticket boxes are available in the database
   * @param boxes - The boxes to process
   * @returns void
   */
  private ticketRedeemCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const ticketRedeemBox = boxes[0];
    const ticketRedeemBuilder = TicketRedeemBuilder.fromBox(ticketRedeemBox);
    const raffleId = ticketRedeemBuilder.getTicketTokenId();
    const currentHeight = await this.network.getHeight();

    this.logger.info(
      `Processing ticket redeem for box [${ticketRedeemBox.boxId}] on raffle [${raffleId}]`,
    );

    // Get all tickets for this raffle from database
    const ticketEntities = await DbService.getInstance().getTickets(raffleId);
    if (ticketEntities.length === 0) {
      this.logger.info(
        `No unspent ticket boxes found for raffle [${raffleId}], skipping ticket redeem`,
      );
      return;
    }
    this.logger.info(
      `Found [${ticketEntities.length}] unspent ticket boxes for raffle [${raffleId}]`,
    );

    let currentTicketRedeemBox = ticketRedeemBox;

    for (const ticketEntity of ticketEntities) {
      this.logger.debug(
        `Creating ticket redeem transaction for ticket box [${ticketEntity.boxId}] on raffle [${raffleId}]`,
      );

      const donatorAddress = ticketEntity.donatorErgoTree;

      // Build the ticket redeem transaction
      const ticketRedeemTxBuilder = new TicketRedeemTxBuilder()
        .setTicketRedeem(currentTicketRedeemBox)
        .setTicket(convertDbBoxesToErgoBoxes([ticketEntity])[0])
        .setDonatorErgoTree(donatorAddress)
        .setChainHeight(currentHeight)
        .setTxFee(configs.ergo.fee);

      const ticketRedeemTx = ticketRedeemTxBuilder.build();

      const signedTicketRedeemTx = await signAndAddTx(
        this.network,
        ticketRedeemTx,
        TxType.TicketRedeem,
      );

      this.logger.info(
        `Ticket redeem transaction for ticket box [${ticketEntity.boxId}] has been added (txId: [${ticketRedeemTx.id}])`,
      );
      currentTicketRedeemBox = new ErgoBox(signedTicketRedeemTx.outputs[0]);
    }

    this.logger.info(
      `Ticket redeem transactions for raffle [${raffleId}] have been successfully executed`,
    );
  };

  /**
   * Add the ticket redeem box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.ticketRedeem,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.ticketRedeemCallback,
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getTicketRedeemBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
    this.logger.debug(
      `Ticket redeem box-lookup request added to the service (requestId: [${requestId}])`,
    );
  }
}
