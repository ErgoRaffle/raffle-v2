import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { FeePaymentTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { RaffleBoxType } from '@ergo-raffle/extractors';
import { ActiveRaffleBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { getConfig } from '../../config/config';

export class FeePaymentService extends AbstractTxService {
  name = 'FeePaymentService';

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
    this.instance = new FeePaymentService(nodeUrl, logger);
  };

  /**
   * Callback for fee payment transaction
   */
  private feePaymentCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const activeRaffleBox = boxes[0];
    const activeRaffleBuilder = ActiveRaffleBuilder.fromBox(activeRaffleBox);
    const raffleId = activeRaffleBuilder.getTicketId(); // The ticket ID is the raffle ID

    this.logger.info(
      `Processing fee payment for active raffle box [${activeRaffleBox.boxId}] with raffle id [${raffleId}]`,
    );

    // Check if the raffle is ended
    const currentHeight = await this.network.getHeight();
    const endHeight = activeRaffleBuilder.getDeadline();

    if (currentHeight < endHeight) {
      this.logger.debug(
        `Raffle [${raffleId}] is not ended yet. Current height: [${currentHeight}], End height: [${endHeight}]`,
      );
      return;
    }

    this.logger.info(
      `Raffle [${raffleId}] is ended. Creating fee payment transaction.`,
    );

    // Find the oracle box (there is only one oracle box)
    const oracleBox = (
      await this.network.getUnspentBoxesByTokenId(
        raffleInfo.tokens.oracleTokenId,
      )
    )[0];
    if (!oracleBox) {
      this.logger.error(
        `Oracle box not found for raffle [${raffleId}], skipping fee payment`,
      );
      return;
    }
    if (oracleBox.creationHeight < endHeight) {
      this.logger.info(
        `Oracle box with id [${oracleBox.boxId}] is not created yet after the raffle deadline [${raffleId}] creation height: [${oracleBox.creationHeight}] vs deadline: [${endHeight}], skipping fee payment`,
      );
      return;
    }

    // Find the raffle details box
    const raffleDetailsBoxEntity =
      await DbService.getInstance().getRaffleDetailsBox(raffleId);
    if (!raffleDetailsBoxEntity) {
      this.logger.error(
        `Raffle details box not found for raffle [${raffleId}], skipping fee payment`,
      );
      return;
    }
    const raffleDetailsBox = convertDbBoxesToErgoBoxes([
      raffleDetailsBoxEntity,
    ])[0];

    // Get the raffle data for service and implementer addresses from database
    const raffleEntity = await DbService.getInstance().getRaffleData(raffleId);
    if (!raffleEntity) {
      this.logger.error(
        `Impossible case: Raffle entity not found for raffle [${raffleId}], skipping fee payment`,
      );
      return;
    }

    // Build the fee payment transaction
    const feePaymentTxBuilder = new FeePaymentTxBuilder()
      .setActiveRaffle(activeRaffleBox)
      .setRaffleDetails(raffleDetailsBox)
      .setOracleBox(oracleBox)
      .setServiceErgoTree(raffleEntity.serviceErgoTree)
      .setImplementerErgoTree(raffleEntity.implementorErgoTree)
      .setChainHeight(currentHeight)
      .setTxFee(getConfig().ergo.fee);

    const feePaymentTx = feePaymentTxBuilder.build();

    await signAndAddTx(this.network, feePaymentTx, TxType.FeePayment);

    this.logger.info(
      `Fee payment transaction for raffle [${raffleId}] has been added (txId: [${feePaymentTx.id}])`,
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
      onSuffice: this.feePaymentCallback,
      getMinedBoxes: async () => {
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
  }
}
