import { OnSufficeCallback } from '@ergo-raffle/box-lookup';
import { InactiveRaffleBuilder } from '@ergo-raffle/boxes/lib/builders/inactiveRaffleBuilder';
import { ErgoBox, ErgoAddress } from '@fleet-sdk/core';
import { raffleInfo } from '@ergo-raffle/contracts';
import { ActivationTxBuilder } from '@ergo-raffle/transactions';
import { TxPot } from '@rosen-bridge/tx-pot';

import { DbService } from '../services/DbService';
import { covertDbBoxesToErgoBoxes, signAndAddTx } from './utils';
import ErgoNodeNetwork from '../network/ErgoNodeNetwork';
import { TxType } from '../txPot/types';
import { DummyLogger, AbstractLogger } from '@rosen-bridge/abstract-logger';

export class BoxLookupCallbacks {
  constructor(
    private readonly network: ErgoNodeNetwork,
    private readonly txPot: TxPot,
    private readonly logger: AbstractLogger = new DummyLogger(),
  ) {}

  /**
   * Callback for the activation of an inactive raffle
   * Note: We assume that the creation transaction has been mined and
   * the raffle entity and ticket repo box are available in the database
   * @param boxes - Contains one inactive raffle box
   * @param unspentBoxes - Current unspent boxes in the mempool/txpot
   */
  activationCallback: OnSufficeCallback = async (
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
      ErgoAddress.fromBase58(raffleInfo.addresses.ticketRepo).ergoTree,
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

    await signAndAddTx(
      this.network,
      this.txPot,
      activationTx,
      TxType.Activation,
    );
    this.logger.info(
      `Activation transaction for raffle id [${inactiveRaffle.getTicketId()}] has been added (txId: [${activationTx.id}])`,
    );
  };
}
