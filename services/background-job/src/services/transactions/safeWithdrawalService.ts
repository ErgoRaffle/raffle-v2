import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { OnSufficeCallback, Request } from '../../types/boxLookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { SafeWithdrawTxBuilder } from '@ergo-raffle/transactions';
import { SafePayBuilder } from '@ergo-raffle/boxes';
import { ErgoBox } from '@fleet-sdk/core';

import { BoxLookupService } from '../boxLookup/boxLoookupService';
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
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): SafeWithdrawalService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as SafeWithdrawalService;
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
    const safePay = boxes[0];
    const safePayEntities = await DbService.getInstance().getSafePayBoxes(
      safePay.boxId,
    );

    if (safePayEntities.length === 0) {
      this.logger.info(
        `No safe pay boxes found in database, skipping safe withdrawal for box [${safePay.boxId}]`,
      );
      return;
    }
    const safePayEntity = safePayEntities[0];

    // Create SafePayBuilder from the box to extract data
    const safePayBuilder = SafePayBuilder.fromBox(safePay);

    // Get the receiver address from the safe pay box
    const txFee = safePayBuilder.getTxFee();

    // Build the safe withdrawal transaction
    const safeWithdrawalTx = new SafeWithdrawTxBuilder()
      .setSafePay(safePay)
      .setReceiverAddress(safePayEntity.recipient)
      .setChainHeight(await this.network.getHeight())
      .setTxFee(txFee)
      .build();

    await signAndAddTx(this.network, safeWithdrawalTx, TxType.SafeWithdrawal);
    this.logger.info(
      `Safe withdrawal transaction for box [${safePay.boxId}] has been added (txId: [${safeWithdrawalTx.id}])`,
    );
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
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getSafePayBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
    this.logger.debug(
      `Safe withdrawal box-lookup request added to the service (requestId: [${requestId}])`,
    );
  }
}
