import { ErgoBox } from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import { ActiveRaffleBuilder, RaffleStatus } from '@ergo-raffle/boxes';
import { raffleInfo } from '@ergo-raffle/contracts';
import { RaffleBoxType } from '@ergo-raffle/extractors';
import { FailureTxBuilder } from '@ergo-raffle/transactions';

import { configs } from '../../config';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { OnSufficeCallback, Request } from '../../types';
import { TxType } from '../../types/transaction';
import { BoxLookupService } from '../boxLookup';
import { DbService } from '../dbService';
import { AbstractTxService } from './abstractTxService';

export class FailureService extends AbstractTxService {
  name = 'FailureService';

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
    this.instance = new FailureService(nodeUrl, logger);
  };

  /**
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): FailureService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as FailureService;
  };

  /**
   * Callback for failure transaction
   * Note: This callback assumes that the raffle details box is available in the database
   * @param boxes - The boxes to process
   * @returns void
   */
  private failureCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const activeRaffleBox = boxes[0];
    const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(activeRaffleBox);
    const raffleId = activeRaffleBuilder.getTicketId(); // The ticket ID is the raffle ID

    // Check if the raffle is ended and get its status
    const currentHeight = await this.network.getHeight();
    const endHeight = activeRaffleBuilder.getDeadline();
    const raffleStatus = activeRaffleBuilder.getRaffleStatus(currentHeight);

    if (raffleStatus === RaffleStatus.PENDING) {
      this.logger.debug(
        `Raffle [${raffleId}] is not ended yet. Current height: [${currentHeight}], End height: [${endHeight}]`,
      );
      return;
    } else if (raffleStatus === RaffleStatus.SUCCESS) {
      this.logger.debug(
        `Raffle [${raffleId}] has successfully reached its goal, skipping failure transaction`,
      );
      return;
    }

    this.logger.info(
      `Raffle [${raffleId}] has ended without reaching the goal. Creating failure transaction for the active raffle box [${activeRaffleBox.boxId}]`,
    );

    // Find the raffle details box
    const raffleDetailsBoxEntity =
      await DbService.getInstance().getRaffleDetailsBox(raffleId);
    if (!raffleDetailsBoxEntity) {
      this.logger.error(
        `Raffle details box not found for raffle [${raffleId}], skipping failure transaction`,
      );
      return;
    }
    const raffleDetailsBox = convertDbBoxesToErgoBoxes([
      raffleDetailsBoxEntity,
    ])[0];

    // Build the failure transaction
    const failureTxBuilder = new FailureTxBuilder()
      .setActiveRaffle(activeRaffleBox)
      .setRaffleDetails(raffleDetailsBox)
      .setChainHeight(currentHeight)
      .setTxFee(configs.ergo.fee);

    const failureTx = failureTxBuilder.build();

    await signAndAddTx(this.network, failureTx, TxType.Failure);

    this.logger.info(
      `Failure transaction for raffle [${raffleId}] has been added (txId: [${failureTx.id}])`,
    );
  };

  /**
   * Add the active raffle box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.activeRaffle,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.failureCallback,
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getRaffleBoxes(
            undefined,
            RaffleBoxType.ActiveRaffle,
          ),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
    this.logger.debug(
      `Failure box-lookup request added to the service (requestId: [${requestId}])`,
    );
  }
}
