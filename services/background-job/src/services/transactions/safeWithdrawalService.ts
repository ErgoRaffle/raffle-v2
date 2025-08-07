import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { SafeWithdrawTxBuilder } from '@ergo-raffle/transactions';
import { SafePayBuilder } from '@ergo-raffle/boxes';
import { ErgoBox } from '@fleet-sdk/core';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { configs } from '../../config';

export class SafeWithdrawalService extends AbstractTxService {
  name = 'SafeWithdrawalService';

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
    this.instance = new SafeWithdrawalService(nodeUrl, logger);
  };

  /**
   * Generator function for a safe withdrawal callback
   * - Build the safe withdrawal transaction for each safe pay box
   * Note: This callback processes all safe pay boxes from the database
   * @param boxes - The boxes (not used in this implementation)
   * @returns A callback for the safe withdrawal of funds
   */
  private safeWithdrawalCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    // Get all safe pay boxes from the database
    const safePayEntities = await DbService.getInstance().getSafePayBoxes();

    if (safePayEntities.length === 0) {
      this.logger.info(
        'No safe pay boxes found in database, skipping safe withdrawal',
      );
      return;
    }

    this.logger.info(
      `Found ${safePayEntities.length} safe pay boxes to process for withdrawal`,
    );

    // Process each safe pay box
    for (const safePayEntity of safePayEntities) {
      try {
        // Create SafePayBuilder from the box to extract data
        const safePayBox = convertDbBoxesToErgoBoxes([safePayEntity])[0];
        const safePayBuilder = SafePayBuilder.fromBox(safePayBox);

        // Get the receiver address from the safe pay box
        const txFee = safePayBuilder.getTxFee();

        // Build the safe withdrawal transaction
        const safeWithdrawalTx = new SafeWithdrawTxBuilder()
          .setSafePay(safePayBox)
          .setReceiverAddress(safePayEntity.recipient)
          .setChainHeight(await this.network.getHeight())
          .setTxFee(txFee)
          .build();

        await signAndAddTx(
          this.network,
          safeWithdrawalTx,
          TxType.SafeWithdrawal,
        );
        this.logger.info(
          `Safe withdrawal transaction for box [${safePayBox.boxId}] has been added (txId: [${safeWithdrawalTx.id}])`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process safe pay box [${safePayEntity.boxId}]: ${error}`,
        );
      }
    }
  };

  /**
   * Add the safe pay box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.safePay,
      value: configs.ergo.fee * 2n, // minimum value for safe pay box is 2x txFee
      tokens: [],
      onSuffice: this.safeWithdrawalCallback,
      getMinedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getSafePayBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
  }
}
