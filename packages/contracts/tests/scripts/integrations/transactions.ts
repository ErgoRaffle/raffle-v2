import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SColl, SByte, SLong, SConstant } from '@fleet-sdk/serializer';
import {
  TransactionBuilder,
  ErgoUnsignedInput,
  TokenAmount,
  Box,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import * as testUtils from '../../testUtils';

/**
 * Create a new raffle using the specified parameters
 * @param creator raffle creator wallet
 * @param serviceBox : current service box
 * @param feeBoxes
 * @param implementerErgoTree
 * @param serviceFeeErgoTree
 * @param winnersCount
 * @param deadline
 * @param winnersPercent
 * @param boxFactory
 * @param collectingTokenId
 * @param ticketPrice
 * @returns the create raffle signed transaction and success status
 */
export const executeCreateRaffleTx = (
  creator: KeyedMockChainParty,
  serviceBox: ErgoUnsignedInput,
  feeBoxes: Box<bigint>[],
  implementerErgoTree: string,
  serviceFeeErgoTree: string,
  winnersCount: number,
  deadline: bigint,
  winnersPercent: Array<bigint>,
  boxFactory: testUtils.RaffleBoxFactory,
  collectingTokenId?: string,
  ticketPrice: bigint = 100n,
  winnersSharePercent: bigint = 200n,
) => {
  serviceBox.setContextExtension({
    0: SColl(SLong, winnersPercent),
    1: SColl(SColl(SByte), [
      Array.from(Buffer.from(implementerErgoTree, 'hex')),
      Array.from(Buffer.from(creator.ergoTree, 'hex')),
    ]),
  });
  const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
    .data as bigint[];
  const serviceFeePercent = serviceR4[0];
  const implementerFeePercent = serviceR4[1];
  const serviceOutputBox = boxFactory.createServiceOutputBox(
    serviceFeeErgoTree,
    serviceBox.assets[1].amount - 1n,
    serviceFeePercent,
    implementerFeePercent,
    serviceR4[2],
  );
  const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
  const inactiveRaffleOutputBox = boxFactory.createInactiveRaffleOutputBox(
    serviceFeeErgoTree,
    implementerErgoTree,
    creator.ergoTree,
    winnersCount,
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: 1n,
        }
      : undefined,
    winnersPercent,
    serviceFeePercent,
    undefined,
    serviceR4[2],
    serviceBox.boxId,
    deadline,
    ticketPrice,
    winnersSharePercent,
  );
  const creationTx = new TransactionBuilder(boxFactory.chain.height)
    .from([serviceBox, ...feeBoxes])
    .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .sendChangeTo(creator.address)
    .build();
  return boxFactory.chain.executeAndReturnOutputs(creationTx, {
    signers: [creator],
  });
};

/**
 * Create a merge transaction to merge inactive raffle and ticket repo
 * and create the active raffle with winner boxes
 * @param inactiveRaffle
 * @param ticketRepo
 * @param winnersCount
 * @param deadline
 * @param boxFactory
 */
export const executeMergeTx = (
  inactiveRaffle: testUtils.OutputBox,
  ticketRepo: testUtils.OutputBox,
  winnersCount: number,
  deadline: bigint,
  boxFactory: testUtils.RaffleBoxFactory,
  winnersSharePercent: bigint[],
) => {
  const r4 = SConstant.from(inactiveRaffle.additionalRegisters.R4!)
    .data as bigint[];
  const r5 = SConstant.from(inactiveRaffle.additionalRegisters.R5!)
    .data as Uint8Array[];
  const ticketTokenId = ticketRepo.assets[0].tokenId;
  const activeRaffleOutputBox =
    boxFactory.createActiveRaffleWithConstantRegisters(
      r4,
      r5,
      winnersCount,
      BigInt(inactiveRaffle.value.toString()) -
        5n * BigInt(winnersCount) * testUtils.FEE -
        testUtils.FEE,
      BigInt(ticketRepo.assets[0].amount.toString()) - BigInt(winnersCount + 1),
      ticketTokenId,
      0n,
      inactiveRaffle.assets.length > 1
        ? {
            tokenId: inactiveRaffle.assets[1].tokenId,
            amount: BigInt(inactiveRaffle.assets[1].amount),
          }
        : undefined,
    );
  const raffleDetailsOutputBox =
    boxFactory.createRaffleDetailsOutputBox(ticketTokenId);
  const giftTokenRepoOutputBox = boxFactory.createGiftTokenRepoOutputBox(
    winnersCount,
    'mint',
    undefined,
    undefined,
    undefined,
    ticketTokenId,
  );

  const winnersBoxes = boxFactory.createWinnersOutputBox(
    winnersCount,
    inactiveRaffle.boxId.toString(),
    ticketTokenId,
    undefined,
    deadline,
    undefined,
    undefined,
    winnersSharePercent,
  );

  const inactiveRaffleTx = new TransactionBuilder(boxFactory.chain.height)
    .from([inactiveRaffle, ticketRepo])
    .to([
      activeRaffleOutputBox,
      raffleDetailsOutputBox,
      giftTokenRepoOutputBox,
      ...winnersBoxes,
    ])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(inactiveRaffleTx);
};

/**
 * Move gift tokens from giftTokenRepo to empty winner boxes
 * This transaction activates the winners gifts
 * @param winner
 * @param giftTokenRepo
 * @param step
 * @param winnersCount
 * @param boxFactory
 */
export const executeGiftTokenReceiptTx = (
  winner: testUtils.OutputBox,
  giftTokenRepo: testUtils.OutputBox,
  step: number,
  winnersCount: number,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const giftTokenId = giftTokenRepo.assets[0].tokenId;
  const ticketTokenId = winner.assets[0].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const winnerIndex = SConstant.from(winner.additionalRegisters.R5!)
    .data as number;
  const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    undefined,
    undefined,
    winnerIndex,
  );
  const outputs = [outWinner];
  if (step < winnersCount)
    outputs.push(
      boxFactory.createGiftTokenRepoOutputBox(
        winnersCount,
        'add',
        step + 1,
        BigInt(giftTokenRepo.value) - testUtils.FEE,
        BigInt(giftTokenRepo.assets[0].amount.toString()) -
          testUtils.GIFT_TOKEN_COUNT,
        ticketTokenId,
        giftTokenId,
      ),
    );

  const giftTokenReceiptTx = new TransactionBuilder(boxFactory.chain.height)
    .from([winner, giftTokenRepo])
    .to(outputs)
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(giftTokenReceiptTx);
};

/**
 * Add gift to a selected winner
 * @param winner
 * @param giftGiver : gift giver wallet
 * @param boxFactory
 */
export const executeAddGiftTx = (
  winner: testUtils.OutputBox,
  giftGiver: KeyedMockChainParty,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const inputWinner = new ErgoUnsignedInput(winner);
  inputWinner.setContextExtension({
    0: SColl(SByte, Array.from(Buffer.from(giftGiver.ergoTree, 'hex'))),
  });
  const ticketTokenId = winner.assets[0].tokenId;
  const giftTokenId = winner.assets[1].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const winnerIndex = SConstant.from(winner.additionalRegisters.R5!)
    .data as number;
  const giftCount = SConstant.from(winner.additionalRegisters.R6!)
    .data as bigint;
  const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    BigInt(winner.assets[1].amount.toString()) - 1n,
    giftCount + 1n,
    winnerIndex,
  );
  const gift = boxFactory.createGiftOutputBox(
    winnerIndex,
    giftGiver.ergoTree,
    testUtils.FEE * 10n,
    giftTokenId,
  );

  const addGiftTx = new TransactionBuilder(boxFactory.chain.height)
    .from([inputWinner, ...giftGiver.utxos.toArray()])
    .to([outWinner, gift])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .sendChangeTo(giftGiver.address)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(addGiftTx, {
    signers: [giftGiver],
  });
};

/**
 * Donate to raffle and receive ticket with the new range
 * @param activeRaffle
 * @param donator : donator wallet
 * @param ticketCount
 * @param boxFactory
 */
export const executeDonateTx = (
  activeRaffle: testUtils.OutputBox,
  donator: KeyedMockChainParty,
  ticketCount: bigint,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const inputActiveRaffle = new ErgoUnsignedInput(activeRaffle);
  inputActiveRaffle.setContextExtension({
    0: SColl(SByte, Array.from(Buffer.from(donator.ergoTree, 'hex'))),
  });
  const r4 = SConstant.from(activeRaffle.additionalRegisters.R4!)
    .data as bigint[];
  const r5 = SConstant.from(activeRaffle.additionalRegisters.R5!)
    .data as Uint8Array[];
  const winnersCount = SConstant.from(activeRaffle.additionalRegisters.R6!)
    .data as number;
  const ticketTokenId = activeRaffle.assets[1].tokenId;
  const totalSoldTickets = SConstant.from(activeRaffle.additionalRegisters.R7!)
    .data as bigint;

  const ticketPrice = r4[3];

  let collectingToken;
  let activeRaffleOutputBoxValue =
    BigInt(activeRaffle.value) + ticketCount * ticketPrice;
  if (activeRaffle.assets.length > 2) {
    collectingToken = {
      tokenId: testUtils.X_TOKEN_ID,
      amount: ticketPrice * ticketCount + BigInt(activeRaffle.assets[2].amount),
    };
    activeRaffleOutputBoxValue = BigInt(activeRaffle.value.toString());
  }

  const activeRaffleOutputBox =
    boxFactory.createActiveRaffleWithConstantRegisters(
      r4,
      r5,
      winnersCount,
      activeRaffleOutputBoxValue,
      BigInt(activeRaffle.assets[1].amount.toString()) - ticketCount,
      ticketTokenId,
      totalSoldTickets + ticketCount,
      collectingToken,
    );

  const ticket = boxFactory.createTicketOutputBox(
    donator.ergoTree,
    ticketCount,
    ticketTokenId,
    [totalSoldTickets, totalSoldTickets + ticketCount, r4[3]],
  );

  const donateTx = new TransactionBuilder(boxFactory.chain.height)
    .from([inputActiveRaffle, ...donator.utxos.toArray()])
    .to([activeRaffleOutputBox, ticket])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .sendChangeTo(donator.address)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(donateTx, {
    signers: [donator],
  });
};

/**
 * Change raffle status from active to failed after deadline
 * @param activeRaffle
 * @param raffleDetails
 * @param boxFactory
 */
export const executeFailureTx = (
  activeRaffle: testUtils.OutputBox,
  raffleDetails: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const r4 = SConstant.from(activeRaffle.additionalRegisters.R4!)
    .data as bigint[];
  const winnersCount = SConstant.from(activeRaffle.additionalRegisters.R6!)
    .data as number;
  const ticketTokenId = activeRaffle.assets[1].tokenId;
  const totalSoldTickets = SConstant.from(activeRaffle.additionalRegisters.R7!)
    .data as bigint;
  const collectingToken =
    activeRaffle.assets.length > 2
      ? {
          tokenId: activeRaffle.assets[2].tokenId,
          amount: BigInt(activeRaffle.assets[2].amount),
        }
      : undefined;
  const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
    BigInt(activeRaffle.value) + BigInt(raffleDetails.value) - testUtils.FEE,
    totalSoldTickets,
    r4[3],
    winnersCount,
    1,
    ticketTokenId,
    // added by one token on the raffle-details box
    BigInt(activeRaffle.assets[1].amount.toString()) + 1n,
    collectingToken,
  );

  const failureTx = new TransactionBuilder(boxFactory.chain.height)
    .from([activeRaffle, raffleDetails])
    .to([giftRedeemOutputBox])
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(failureTx);
};

/**
 * Return the gift to the gift giver
 * @param giftRedeem
 * @param winner
 * @param gift
 * @param boxFactory
 */
export const executeGiftReturnTx = (
  giftRedeem: testUtils.OutputBox,
  winner: testUtils.OutputBox,
  gift: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const ticketTokenId = winner.assets[0].tokenId;
  const giftTokenId = winner.assets[1].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const winnerIndex = SConstant.from(winner.additionalRegisters.R5!)
    .data as number;
  const giftCount = SConstant.from(winner.additionalRegisters.R6!)
    .data as bigint;
  const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    BigInt(winner.assets[1].amount.toString()) + 1n,
    giftCount - 1n,
    winnerIndex,
  );

  const redeemedGift = boxFactory.createSafePayOutputBox(
    BigInt(gift.value.toString()) - testUtils.FEE,
    gift.assets.slice(1),
    SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
  );
  const giftReturnTx = new TransactionBuilder(boxFactory.chain.height)
    .from([winner, gift])
    .to([outWinner, redeemedGift])
    .withDataFrom([giftRedeem])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(giftReturnTx);
};

/**
 * Remove the winner box after returning all related gifts
 * @param giftRedeem
 * @param winner
 * @param boxFactory
 */
export const executeWinnerRemovalTx = (
  giftRedeem: testUtils.OutputBox,
  winner: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const r4 = SConstant.from(giftRedeem.additionalRegisters.R4!)
    .data as bigint[];
  const winnersCount = SConstant.from(giftRedeem.additionalRegisters.R5!)
    .data as number;
  const step = SConstant.from(giftRedeem.additionalRegisters.R6!)
    .data as number;
  const ticketTokenId = giftRedeem.assets[1].tokenId;
  const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
    BigInt(giftRedeem.value.toString()) + 3n * testUtils.FEE,
    r4[0],
    r4[1],
    winnersCount,
    step + 1,
    ticketTokenId,
    BigInt(giftRedeem.assets[1].amount.toString()) + 1n,
  );

  const winnerRemovalTx = new TransactionBuilder(boxFactory.chain.height)
    .from([giftRedeem, winner])
    .to([giftRedeemOutputBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .burnTokens(winner.assets[1]!)
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(winnerRemovalTx);
};

/**
 * Forward to next step to redeem the tickets
 * @param giftRedeem
 * @param boxFactory
 * @returns
 */
export const executeForwardToTicketRedeemTx = (
  giftRedeem: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const r4 = SConstant.from(giftRedeem.additionalRegisters.R4!)
    .data as bigint[];
  const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
    BigInt(giftRedeem.value.toString()) - testUtils.FEE,
    r4[0],
    r4[1],
    0n,
    giftRedeem.assets[1].tokenId,
    BigInt(giftRedeem.assets[1].amount.toString()),
  );

  if (giftRedeem.assets.length > 2)
    ticketRedeemOutputBox.assets.add(giftRedeem.assets[2]);

  const forwardToTicketRedeemTx = new TransactionBuilder(
    boxFactory.chain.height,
  )
    .from([giftRedeem])
    .to([ticketRedeemOutputBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(forwardToTicketRedeemTx);
};

/**
 * Return ticket tokens and redeem donation to the donator
 * @param ticketRedeem
 * @param ticket
 * @param boxFactory
 */
export const executeTicketRedeemTx = (
  ticketRedeem: testUtils.OutputBox,
  ticket: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const r4 = SConstant.from(ticketRedeem.additionalRegisters.R4!)
    .data as bigint[];
  const redeemedTickets = SConstant.from(ticketRedeem.additionalRegisters.R5!)
    .data as bigint;
  const ticketPrice = r4[1];
  const ticketCount = BigInt(ticket.assets[0].amount.toString());

  let redeemedDonationValue =
    BigInt(ticket.value.toString()) - testUtils.FEE + ticketPrice * ticketCount;
  const redeemedDonationTokens = [];
  let collectingToken: TokenAmount<bigint> | undefined = undefined;
  let ticketRedeemOutputBoxValue =
    BigInt(ticketRedeem.value.toString()) - ticketPrice * ticketCount;
  if (ticketRedeem.assets.length > 2) {
    redeemedDonationValue = BigInt(ticket.value.toString()) - testUtils.FEE;

    redeemedDonationTokens.push({
      tokenId: ticketRedeem.assets[2].tokenId,
      amount: ticketCount * ticketPrice,
    });
    ticketRedeemOutputBoxValue = BigInt(ticketRedeem.value.toString());
    collectingToken = {
      tokenId: ticketRedeem.assets[2].tokenId,
      amount: BigInt(ticketRedeem.assets[2].amount) - ticketCount * ticketPrice,
    };
  }

  const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
    ticketRedeemOutputBoxValue,
    r4[0],
    r4[1],
    redeemedTickets + ticketCount,
    ticketRedeem.assets[1].tokenId,
    BigInt(ticketRedeem.assets[1].amount.toString()) + ticketCount,
    collectingToken,
  );

  const redeemedDonation = boxFactory.createSafePayOutputBox(
    redeemedDonationValue,
    redeemedDonationTokens,
    SConstant.from(ticket.additionalRegisters.R4!).data as Uint8Array,
  );

  const ticketRedeemTx = new TransactionBuilder(boxFactory.chain.height)
    .from([ticketRedeem, ticket])
    .to([ticketRedeemOutputBox, redeemedDonation])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(ticketRedeemTx);
};

/**
 * Return raffle license to the service box after raffle completion
 * @param endedRaffle
 * @param service
 * @param boxFactory
 * @param serviceFeeErgoTree
 */
export const executeReturnRaffleLicenseTx = (
  endedRaffle: testUtils.OutputBox,
  service: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
  changeAddress: string,
  serviceFeeErgoTree: string,
) => {
  const serviceR4 = SConstant.from(service.additionalRegisters.R4!)
    .data as bigint[];
  const serviceFeePercent = serviceR4[0];
  const implementerFeePercent = serviceR4[1];
  const serviceOutputBox = boxFactory.createServiceOutputBox(
    serviceFeeErgoTree,
    BigInt(service.assets[1].amount.toString()) + 1n,
    serviceFeePercent,
    implementerFeePercent,
    serviceR4[2],
  );
  const changeBox = boxFactory.createSafePayOutputBox(
    BigInt(endedRaffle.value.toString()) - testUtils.FEE,
    endedRaffle.assets[2] ? [endedRaffle.assets[2]] : [],
    blake2b256(Buffer.from(changeAddress, 'hex')),
  );

  const ticketRedeemTx = new TransactionBuilder(boxFactory.chain.height)
    .from([service, endedRaffle])
    .to([serviceOutputBox, changeBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .burnTokens(endedRaffle.assets[1]) // burn remaining tickets
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(ticketRedeemTx);
};

/**
 * Execute fee payment transaction
 * @param activeRaffleBox
 * @param raffleDetailsBox
 * @param boxFactory
 * @returns
 */
export const executeFeePaymentTx = (
  activeRaffleBox: testUtils.OutputBox,
  raffleDetailsBox: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const oracleBox = boxFactory.createMockedOracleUTxO(testUtils.FEE);
  const r4 = SConstant.from(activeRaffleBox.additionalRegisters.R4!)
    .data as bigint[];
  const totalSoldTickets = SConstant.from(
    activeRaffleBox.additionalRegisters.R7!,
  ).data as bigint;
  const winnersCount = SConstant.from(activeRaffleBox.additionalRegisters.R6!)
    .data as number;
  const r5 = SConstant.from(activeRaffleBox.additionalRegisters.R5!)
    .data as Uint8Array[];
  const serviceAddressHash = r5[0];
  const implementerAddressHash = r5[1];
  const projectAddressHash = r5[2];

  const winnerPercent = r4[0];
  const serviceFeePercent = r4[1];
  const implementerFeePercent = r4[2];
  const totalFeePercent = serviceFeePercent + implementerFeePercent;
  const ticketPrice = r4[3];
  const totalRaised = totalSoldTickets * ticketPrice;
  const totalPrize = (totalRaised * winnerPercent) / 1000n;

  const isErgGoal = activeRaffleBox.assets.length <= 2;

  const createTokenPercent = (percent: bigint): Array<TokenAmount<bigint>> => {
    if (isErgGoal) return [];
    return [
      {
        tokenId: activeRaffleBox.assets[2].tokenId,
        amount: (totalRaised * percent) / 1000n,
      },
    ];
  };
  const serviceFeeBox = boxFactory.createSafePayOutputBox(
    (isErgGoal ? BigInt((totalRaised * serviceFeePercent) / 1000n) : 0n) +
      2n * testUtils.FEE,
    createTokenPercent(serviceFeePercent),
    serviceAddressHash,
  );
  const implementerFeeBox = boxFactory.createSafePayOutputBox(
    (isErgGoal ? BigInt((totalRaised * implementerFeePercent) / 1000n) : 0n) +
      2n * testUtils.FEE,
    createTokenPercent(serviceFeePercent),
    implementerAddressHash,
  );
  const activeRaffleValue = BigInt(activeRaffleBox.value.toString());
  const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
    activeRaffleValue -
      4n * testUtils.FEE -
      (isErgGoal ? (totalFeePercent * totalRaised) / 1000n : 0n),
    activeRaffleBox.assets[0].tokenId,
    oracleBox.boxId.toString(),
    projectAddressHash,
    [],
    totalSoldTickets,
    winnersCount,
    BigInt(totalPrize),
    isErgGoal
      ? 0n
      : BigInt(activeRaffleBox.assets[2].amount) -
          (totalFeePercent * totalRaised) / 1000n,
    1,
    activeRaffleBox.assets[1].tokenId,
    // plus one token that exists on the Raffle-Details box
    BigInt(activeRaffleBox.assets[1].amount) + 1n,
    isErgGoal ? undefined : activeRaffleBox.assets[2].tokenId,
  );

  const rewardTx = new TransactionBuilder(boxFactory.chain.height)
    .from([activeRaffleBox, raffleDetailsBox])
    .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
    .withDataFrom([oracleBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  const result = boxFactory.chain.executeAndReturnOutputs(rewardTx);

  const unsignedOutputs = [];
  for (const outbox of result.outputs)
    unsignedOutputs.push(new ErgoUnsignedInput(outbox));
  return {
    success: result.success,
    outputs: unsignedOutputs,
  };
};

/**
 * Execute prize creation transaction
 * @param successRaffleBox
 * @param winnerBox
 * @param winnerTicketIndex
 * @param winnerIndexList
 * @param boxFactory
 * @returns
 */
export const executePrizeCreationTx = (
  successRaffleBox: ErgoUnsignedInput,
  winnerBox: testUtils.OutputBox,
  winnerTicketIndex: bigint,
  winnerIndexList: bigint[],
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  successRaffleBox.setContextExtension({
    0: SColl(SLong, [...winnerIndexList]),
    1: SLong(winnerTicketIndex),
  });

  const successRaffleR4 = SConstant.from(
    successRaffleBox.additionalRegisters.R4!,
  ).data as bigint[];
  const projectAddressHash = SConstant.from(
    successRaffleBox.additionalRegisters.R6!,
  ).data as Uint8Array;
  const winnersCount = SConstant.from(successRaffleBox.additionalRegisters.R5!)
    .data as number;
  const successRaffleR7 = SConstant.from(
    successRaffleBox.additionalRegisters.R7!,
  ).data as Uint8Array[];
  const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
    .data as bigint[];
  const winnerIndex = SConstant.from(winnerBox.additionalRegisters.R5!)
    .data as number;

  const totalPrize = successRaffleR4[0];
  const totalSoldTickets = successRaffleR4[1];
  const seed = Buffer.from(
    blake2b256(Buffer.from(successRaffleR7[0])),
  ).toString('hex');

  const giftCount = SConstant.from(winnerBox.additionalRegisters.R6!)
    .data as bigint;

  const prizeAmount = (totalPrize * winnerR4[0]) / 1000n;
  const isErgGoal = successRaffleBox.assets.length == 2;
  const prizeBox = boxFactory.createWinnerPrizeOutputBox(
    isErgGoal ? testUtils.FEE * 3n + prizeAmount : testUtils.FEE * 3n,
    winnerIndex,
    winnerTicketIndex,
    giftCount,
    0n,
    BigInt(winnerBox.assets[1].amount.toString()),
    isErgGoal || prizeAmount == 0n
      ? undefined
      : {
          tokenId: successRaffleBox.assets[2].tokenId,
          amount: prizeAmount,
        },
    winnerBox.assets[0].tokenId,
    winnerBox.assets[1].tokenId,
  );

  winnerIndexList.push(BigInt(winnerTicketIndex));
  const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
    isErgGoal ? successRaffleBox.value - prizeAmount : successRaffleBox.value,
    successRaffleBox.assets[0].tokenId,
    seed,
    projectAddressHash,
    winnerIndexList,
    totalSoldTickets,
    winnersCount,
    totalPrize,
    isErgGoal ? 0n : successRaffleBox.assets[2].amount - prizeAmount,
    winnerIndex + 1,
    successRaffleBox.assets[1].tokenId,
    BigInt(successRaffleBox.assets[1].amount),
    isErgGoal ? undefined : successRaffleBox.assets[2].tokenId,
  );

  const prizeTx = new TransactionBuilder(boxFactory.chain.height)
    .from([successRaffleBox, winnerBox])
    .to([successRaffleOutputBox, prizeBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  const result = boxFactory.chain.executeAndReturnOutputs(prizeTx);
  const unsignedOutputs = [];
  for (const outbox of result.outputs)
    unsignedOutputs.push(new ErgoUnsignedInput(outbox));
  return {
    success: result.success,
    outputs: unsignedOutputs,
  };
};

/**
 * Execute gift unwrap transaction
 * @param winnerPrizeBox
 * @param giftForWinnerBox
 * @param ticketBox
 * @param prizeNumber
 * @param boxFactory
 * @returns
 */
export const executeGiftUnwrapTx = (
  winnerPrizeBox: testUtils.OutputBox,
  giftForWinnerBox: testUtils.OutputBox,
  ticketBox: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const winnerPrizeR4 = SConstant.from(winnerPrizeBox.additionalRegisters.R4!)
    .data as bigint[];
  const winnerIndex = SConstant.from(winnerPrizeBox.additionalRegisters.R5!)
    .data as number;
  const unwrappedGiftCount = SConstant.from(
    winnerPrizeBox.additionalRegisters.R6!,
  ).data as bigint;

  const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
    BigInt(winnerPrizeBox.value),
    winnerIndex,
    winnerPrizeR4[0],
    winnerPrizeR4[1],
    unwrappedGiftCount + 1n,
    BigInt(winnerPrizeBox.assets[1].amount.toString()) + 1n,
    winnerPrizeBox.assets[2],
    winnerPrizeBox.assets[0].tokenId,
    winnerPrizeBox.assets[1].tokenId,
  );

  const giftOutputBoxTokens = giftForWinnerBox.assets.slice(
    1,
    giftForWinnerBox.assets.length,
  );

  const unwrappedGiftBox = boxFactory.createSafePayOutputBox(
    BigInt(giftForWinnerBox.value) - testUtils.FEE,
    giftOutputBoxTokens,
    SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
  );

  const giftUnwrapTx = new TransactionBuilder(boxFactory.chain.height)
    .from([winnerPrizeBox, giftForWinnerBox])
    .to([prizeOutputBox, unwrappedGiftBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .withDataFrom([ticketBox])
    .payFee(testUtils.FEE)
    .build();
  return boxFactory.chain.executeAndReturnOutputs(giftUnwrapTx);
};

/**
 * Execute final prize transaction
 * @param winnerPrizeBox
 * @param ticketBox
 * @param boxFactory
 * @returns
 */
export const executeFinalPrizeTx = (
  winnerPrizeBox: testUtils.OutputBox,
  ticketBox: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const finalPrizeSpendingBox = boxFactory.createSafePayOutputBox(
    BigInt(winnerPrizeBox.value) - testUtils.FEE,
    winnerPrizeBox.assets.length > 2 ? [winnerPrizeBox.assets[2]] : [],
    SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
  );

  const finalPrizeTx = new TransactionBuilder(boxFactory.chain.height)
    .from([winnerPrizeBox])
    .to([finalPrizeSpendingBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .withDataFrom([ticketBox])
    .burnTokens(winnerPrizeBox.assets.slice(0, 2))
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(finalPrizeTx);
};

/**
 * Execute safe withdraw transaction to send all funds to the receiver address
 * @param safePayBox
 * @param receiverAddress
 * @param boxFactory
 * @returns
 */
export const executeSafeWithdrawTransaction = (
  safePayBox: testUtils.OutputBox,
  receiverAddress: string,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const safeWithdrawBox = boxFactory.createCustomOutputBox(
    BigInt(safePayBox.value) - testUtils.FEE,
    safePayBox.assets,
    receiverAddress,
  );

  const safeWithdrawTx = new TransactionBuilder(boxFactory.chain.height)
    .from([safePayBox])
    .to([safeWithdrawBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(safeWithdrawTx);
};
