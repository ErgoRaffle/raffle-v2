import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { Request, OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { raffleInfo } from '@ergo-raffle/contracts';
import { PrizeCreationTxBuilder } from '@ergo-raffle/transactions';
import { ErgoBox } from '@fleet-sdk/core';
import { SuccessRaffleBuilder, WinnerBuilder } from '@ergo-raffle/boxes';

import { BoxLookupService } from '../boxLoookupService';
import { DbService } from '../dbService';
import {
  signAndAddTx,
  convertDbBoxesToErgoBoxes,
  uint8ArrayToSignedBigInt,
} from '../../transactions/utils';
import { TxType } from '../../types/transaction';
import { AbstractTxService } from './abstractTxService';
import { configs } from '../../config';
import { findAllWinners } from '../../transactions/boxFinder';

export class PrizeCreationService extends AbstractTxService {
  name = 'PrizeCreationService';

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
    this.instance = new PrizeCreationService(nodeUrl, logger);
  };

  /**
   * Get the instance of the service
   * @returns The instance of the service
   */
  static getInstance = (): PrizeCreationService => {
    if (!this.instance) {
      throw new Error(`${this.name} is not initialized`);
    }
    return this.instance as PrizeCreationService;
  };

  /**
   * Callback for prize creation transaction
   * - Calculates the next winner ticket index for each winner from random seed
   * using the raffle winner selection algorithm
   * - Builds the prize creation transaction for each winner and chains them to each other
   * - Note: This service assumes that the success raffle box is available in the database
   * @param boxes - The boxes to process
   * @returns void
   */
  private prizeCreationCallback: OnSufficeCallback = async (
    boxes: ErgoBox[],
  ): Promise<void> => {
    const successRaffleBox = boxes[0];
    const successRaffleBuilder = SuccessRaffleBuilder.fromBox(successRaffleBox);
    const raffleId = successRaffleBuilder.getTicketTokenId();
    const step = successRaffleBuilder.getStep();
    const winnersCount = successRaffleBuilder.getWinnerCount();

    this.logger.info(
      `Processing prize creation for success raffle box [${successRaffleBox.boxId}] with raffle id [${raffleId}], step [${step}], winners count [${winnersCount}]`,
    );

    // Get all winner boxes for this raffle
    const winnerBoxes = await findAllWinners(boxes, raffleId);
    this.logger.debug(
      `Found winner boxes: ${winnerBoxes.map((box) => box.boxId)}`,
    );

    // Initialize winner tickets list
    const selectedWinnerTickets =
      await this.getSelectedWinnersList(successRaffleBuilder);
    if (!selectedWinnerTickets) {
      this.logger.error(
        `No unspent success raffle boxes found for raffle [${raffleId}] with step [${step}] in database, skipping prize creation`,
      );
      return;
    }

    // Initialize current success raffle box
    let currentSuccessRaffleBox = successRaffleBox;

    // Process each winner in sequence
    for (let i = step; i <= winnersCount; i++) {
      const winnerBox = winnerBoxes.find((box) => {
        const winnerBoxBuilder = WinnerBuilder.fromBox(box);
        return winnerBoxBuilder.getWinnerIndex() === i;
      });
      if (!winnerBox) {
        this.logger.error(
          `Winner box not found with index ${i}, skipping prize creation for raffle [${raffleId}]`,
        );
        return;
      }

      this.logger.debug(
        `Creating prize creation transaction for winner box [${winnerBox.boxId}] with index [${i}]`,
      );

      // Generate next winner ticket index using the algorithm from scenario3
      const totalSoldTickets = successRaffleBuilder.getTotalSoldTickets();
      const seed = successRaffleBuilder.getSeed();

      // Generate next winner ticket index
      const nextWinnerTicketIndex = this.generateNextWinnerIndex(
        selectedWinnerTickets,
        i,
        seed,
        totalSoldTickets,
      );

      // Build the prize creation transaction
      const prizeCreationTx = new PrizeCreationTxBuilder()
        .setSuccessRaffle(currentSuccessRaffleBox)
        .setWinner(winnerBox)
        .setWinnerTicketIndex(nextWinnerTicketIndex)
        .setWinnerIndexList([...selectedWinnerTickets])
        .setChainHeight(await this.network.getHeight())
        .setTxFee(configs.ergo.fee)
        .build();

      const signedTx = await signAndAddTx(
        this.network,
        prizeCreationTx,
        TxType.PrizeCreation,
      );

      this.logger.info(
        `Prize creation transaction for winner [${i}] of raffle [${raffleId}] has been added (txId: [${prizeCreationTx.id}])`,
      );

      // Update for next iteration
      selectedWinnerTickets.push(nextWinnerTicketIndex);
      currentSuccessRaffleBox = new ErgoBox(signedTx.outputs[0]);
    }
  };

  /**
   * Get the selected winners list from the database
   * @param successRaffleBuilder - The success raffle builder
   * @returns The selected winners list
   */
  private getSelectedWinnersList = async (
    successRaffleBuilder: SuccessRaffleBuilder,
  ): Promise<bigint[] | undefined> => {
    const raffleId = successRaffleBuilder.getTicketTokenId();
    const step = successRaffleBuilder.getStep();

    if (successRaffleBuilder.getStep() > 1) {
      // Get the success raffle info from database
      const successRaffleBoxes =
        await DbService.getInstance().getSuccessRaffleBoxes(raffleId);
      this.logger.debug(
        `Found success raffle box, step: ${successRaffleBoxes[0].step}, selected winners list: ${successRaffleBoxes[0].selectedWinnersList}`,
      );
      if (
        successRaffleBoxes.length == 0 ||
        successRaffleBoxes[0].step != step
      ) {
        return undefined;
      }
      return successRaffleBoxes[0].selectedWinnersList.split(',').map(BigInt);
    }
    return [];
  };

  /**
   * Generate the next winner index
   * @param winnerIndexList - The list of winner indices
   * @param step - The step number
   * @param seed - The seed
   * @param ticketCount - The total number of tickets
   * @returns The next winner index
   */
  private generateNextWinnerIndex = (
    winnerIndexList: bigint[],
    step: number,
    seed: Uint8Array,
    ticketCount: bigint,
  ) => {
    const bigintSeed = uint8ArrayToSignedBigInt(seed.slice(0, 16));
    const range = ticketCount - BigInt(step) + 1n;
    const rawWinnerIndex = ((bigintSeed % range) + range) % range;

    let shift = 0n,
      oldShift = 0n;
    do {
      oldShift = shift;
      shift = BigInt(
        winnerIndexList.filter((value) => {
          return value <= rawWinnerIndex + shift;
        }).length,
      );
    } while (oldShift !== shift);

    return rawWinnerIndex + shift;
  };

  /**
   * Add the success raffle box-lookup request to the service
   */
  addBaseRequests(): void {
    const request: Request = {
      address: raffleInfo.addresses.successRaffle,
      value: undefined,
      tokens: [
        {
          tokenId: raffleInfo.tokens.raffleLicense,
          amount: 1n,
        },
      ],
      onSuffice: this.prizeCreationCallback,
      getConfirmedBoxes: async () => {
        return convertDbBoxesToErgoBoxes(
          await DbService.getInstance().getSuccessRaffleBoxes(),
        );
      },
    };

    const requestId = BoxLookupService.getInstance().addRequest(request);
    this.activeBoxLookupRequestIds.push(requestId);
    this.logger.debug(
      `Prize creation box-lookup request added to the service (requestId: [${requestId}])`,
    );
  }
}
