import {
  ErgoAddress,
  ErgoBox,
  Network,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';

import { raffleInfo } from '@ergo-raffle/contracts';
import { AddGiftProxyEntity } from '@ergo-raffle/extractors';
import { AddGiftTxBuilder } from '@ergo-raffle/transactions';

import { configs } from '../../config';
import { findWinner } from '../../transactions/boxFinder';
import {
  calculateBoxesAssetSum,
  convertDbBoxesToErgoBoxes,
  signAndAddTx,
} from '../../transactions/utils';
import { OnSufficeCallback, Request } from '../../types';
import { TxType } from '../../types/transaction';
import { BoxLookupService } from '../boxLookup';
import { DbService } from '../dbService';
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
   * Register a box-lookup request watching all add-gift proxy boxes
   */
  addBaseRequests(): void {
    const boxLookupRequest: Request = {
      address: raffleInfo.addresses.addGiftProxy,
      // Should process all boxes with the add-gift proxy address
      value: undefined,
      tokens: [],
      onSuffice: this.addGiftCallback,
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getAddGiftProxyBoxes(),
        );
      },
    };

    const requestId =
      BoxLookupService.getInstance().addRequest(boxLookupRequest);
    this.activeBoxLookupRequestIds.push(requestId);
  }

  /**
   * Callback triggered when a UID group of add-gift proxy boxes is covering.
   * Builds the add-gift transaction with all value and assets from the proxy boxes.
   */
  addGiftCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
    unspentBoxes: ErgoBox[],
    requestId: number,
  ): Promise<void> => {
    const proxyBox = boxes[0];
    this.logger.info(`Processing add gift tx for proxy box ${proxyBox.boxId}`);

    /* TODO: Optimize proxy transaction speed.
    Now we have to wait for proxy box to be confirmed to get the entity
    local/ergo/ergoraffle/raffle-v2/-/issues/129 */
    const addGiftEntity = (
      await DbService.getInstance().getAddGiftProxyBoxes(proxyBox.boxId)
    )[0];
    if (!addGiftEntity) {
      this.logger.info(
        `AddGift proxy entity not found for proxy box ${proxyBox.boxId}, skipping add gift transaction`,
      );
      return;
    }
    if (addGiftEntity.expirationHeight < (await this.network.getHeight())) {
      this.logger.info(
        `AddGift proxy box ${proxyBox.boxId} has expired, redeeming proxy box and skipping add gift transaction`,
      );
      await this.redeemProxy(proxyBox, addGiftEntity);
      return;
    }

    if (!this.isCoveringRequest(proxyBox, addGiftEntity)) {
      this.logger.info(
        `Proxy boxes are not covering the request, skipping add gift transaction and waiting for proxy box expiration`,
      );
      return;
    }
    this.logger.debug(
      `AddGift proxy box ${proxyBox.boxId} is covering the request, building add gift transaction`,
    );

    const winnerBox = await findWinner(
      unspentBoxes,
      addGiftEntity.raffleId,
      addGiftEntity.winnerIndex,
    );
    if (!winnerBox) {
      this.logger.warn(
        `Winner box not found, skipping add gift transaction for raffle ${addGiftEntity.raffleId} (request id: [${requestId}])`,
      );
      return;
    }
    this.logger.debug(
      `Winner box found with id [${winnerBox.boxId}], building add gift transaction`,
    );

    const sum = calculateBoxesAssetSum(boxes);
    const txFee = configs.ergo.fee;
    const giftGiverAddress = ErgoAddress.fromErgoTree(
      Buffer.from(addGiftEntity.giftGiverErgoTree, 'hex'),
    ).toString(
      raffleInfo.network === 'Mainnet' ? Network.Mainnet : Network.Testnet,
    );

    const addGiftTx = new AddGiftTxBuilder()
      .setWinner(winnerBox)
      .setGiftGiverUtxos([proxyBox])
      .setGiftGiverAddress(giftGiverAddress)
      .setGiftValue(sum.value - txFee)
      .setGiftTokens(sum.tokens)
      .setChainHeight(await this.network.getHeight())
      .setTxFee(txFee)
      .build();

    await signAndAddTx(this.network, addGiftTx, TxType.AddGift);

    this.logger.info(
      `Add gift transaction for request with id [${requestId}] has been added (txId: [${addGiftTx.id}])`,
    );
  };

  /**
   * Check if the add-gift proxy boxes are covering the request
   * @param boxes - The proxy boxes for this UID group
   * @param entity - The add-gift proxy entity
   * @returns True if the boxes cover the required value
   */
  isCoveringRequest = (box: ErgoBox, entity: AddGiftProxyEntity): boolean => {
    const requiredErg = entity.txFee * 4n;
    const covering = box.value >= requiredErg;
    this.logger.debug(
      `AddGiftProxy covering: totalValue=${box.value}, ` +
        `requiredErg>=${requiredErg}, covering=${covering}`,
    );
    return covering;
  };

  /**
   * Redeem the proxy boxes back to the gift giver
   * @param box - The proxy box to redeem
   * @param entity - The add-gift proxy entity
   */
  redeemProxy = async (
    box: ErgoBox,
    entity: AddGiftProxyEntity,
  ): Promise<void> => {
    const giftGiverRefundBox = new OutputBuilder(
      BigInt(box.value) - entity.txFee,
      entity.giftGiverErgoTree,
    ).addTokens(
      box.assets.map((asset) => ({
        tokenId: asset.tokenId,
        amount: BigInt(asset.amount),
      })),
    );
    const redeemTx = new TransactionBuilder(await this.network.getHeight())
      .from([box])
      .to([giftGiverRefundBox])
      .payFee(entity.txFee)
      .build();
    await signAndAddTx(this.network, redeemTx, TxType.RedeemProxy);
    this.logger.info(
      `Proxy box ${box.boxId} has been redeemed to ${entity.giftGiverErgoTree} (txId: [${redeemTx.id}])`,
    );
  };
}
