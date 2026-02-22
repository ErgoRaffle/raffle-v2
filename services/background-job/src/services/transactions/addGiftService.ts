import { ErgoBox } from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import { AddGiftTxBuilder } from '@ergo-raffle/transactions';

import { configs } from '../../config';
import { AddGiftParamsEntity } from '../../database/entities';
import { findWinner } from '../../transactions/boxFinder';
import { signAndAddTx, calculateBoxesAssetSum } from '../../transactions/utils';
import { OnSufficeCallback, Request } from '../../types';
import { TxType } from '../../types/transaction';
import { BoxLookupService } from '../boxLookup';
import { ScannerService } from '../scannerService';
import { TxPotService } from '../txPotService';
import { AbstractTxService } from './abstractTxService';

export class AddGiftService extends AbstractTxService {
  name = 'AddGiftService';

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
    this.instance = new AddGiftService(nodeUrl, logger);
  };

  /**
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): AddGiftService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as AddGiftService;
  };

  /**
   * This service doesn't have any base requests
   */
  addBaseRequests(): void {
    return;
  }

  /**
   * Generator function for an add gift callback
   * - Find the winner box for the raffle
   * - Build the add gift transaction with all value and assets from the proxy boxes
   * @param addGiftParams - The add gift parameters
   * @returns A callback for adding a gift
   */
  private addGiftCallbackGenerator = (
    addGiftParams: AddGiftParamsEntity,
  ): OnSufficeCallback => {
    const addGiftCallBack = async (
      boxes: ErgoBox[],
      unspentBoxes: ErgoBox[],
      requestId: number,
    ): Promise<void> => {
      this.logger.info(
        `Processing add gift tx for raffle ${addGiftParams.raffleId} to winner ${addGiftParams.winnerIndex}`,
      );
      // Find the winner box from unspent boxes
      const winnerBox = await findWinner(
        unspentBoxes,
        addGiftParams.raffleId,
        addGiftParams.winnerIndex,
      );
      if (!winnerBox) {
        this.logger.warn(
          `winner box not found, skipping add gift transaction for raffle ${addGiftParams.raffleId}`,
        );
        return;
      }
      this.logger.info(
        `Winner box found with id [${winnerBox.boxId}], building add gift transaction`,
      );

      // Calculate total value and collect all assets from proxy boxes
      const sum = calculateBoxesAssetSum(boxes);
      const txFee = configs.ergo.fee;

      const addGiftTx = new AddGiftTxBuilder()
        .setWinner(winnerBox)
        .setGiftGiverUtxos(boxes)
        .setGiftGiverAddress(addGiftParams.giftGiverAddress)
        .setGiftValue(sum.value - txFee)
        .setGiftTokens(sum.tokens)
        .setChainHeight(await this.network.getHeight())
        .setTxFee(txFee)
        .build();

      await signAndAddTx(this.network, addGiftTx, TxType.AddGift);

      // Add the txpot callback
      const callbackId = `${TxType.AddGift}-${addGiftParams.id}`;
      this.activeTxpotCallbackIds.push([TxType.AddGift, callbackId]);
      TxPotService.getInstance().registerCompletionCallback(
        TxType.AddGift,
        callbackId,
        this.txpotCallBackGenerator(
          addGiftTx.id,
          requestId,
          callbackId,
          TxType.AddGift,
          addGiftParams.proxyAddress,
        ),
      );

      this.logger.info(
        `Add gift transaction for request with id [${requestId}] has been added (txId: [${addGiftTx.id}])`,
      );
    };
    return addGiftCallBack;
  };

  /**
   * Create an add gift request and register it with the box lookup service
   * @param addGiftParams - The add gift parameters
   */
  public addGift(addGiftParams: AddGiftParamsEntity): void {
    // Add the proxy address to the scanner
    ScannerService.getInstance().addDynamicAddress(addGiftParams.proxyAddress);

    // Build the box lookup request
    const boxLookupRequest: Request = {
      address: addGiftParams.proxyAddress,
      value: 3n * configs.ergo.fee, // minimum value for add gift transaction
      tokens: [], // We'll collect all tokens from the boxes
      onSuffice: this.addGiftCallbackGenerator(addGiftParams),
      getConfirmedBoxes: async () => {
        return [];
      },
    };

    // Register the request with the box lookup service
    const requestId =
      BoxLookupService.getInstance().addRequest(boxLookupRequest);
    this.activeBoxLookupRequestIds.push(requestId);
  }
}
