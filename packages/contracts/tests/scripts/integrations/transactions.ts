import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SColl, SByte, SLong, SConstant } from '@fleet-sdk/serializer';
import {
  TransactionBuilder,
  ErgoUnsignedInput,
  TokenAmount,
  Box,
} from '@fleet-sdk/core';

import * as testUtils from '../../testUtils';

/**
 * Create a new raffle using the specified parameters
 * @param creator raffle creator wallet
 * @param serviceBox : current service box
 * @param feeBoxes
 * @param implementerAddress
 * @param winnersCount
 * @param deadline
 * @param winnersPercent
 * @param boxFactory : mocked chain
 * @param collectingTokenId
 * @param ticketPrice
 * @returns the create raffle signed transaction and success status
 */
export const executeCreateRaffleTx = (
  creator: KeyedMockChainParty,
  serviceBox: ErgoUnsignedInput,
  feeBoxes: Box<bigint>[],
  implementerAddress: string,
  winnersCount: bigint,
  deadline: bigint,
  winnersPercent: Array<bigint>,
  boxFactory: testUtils.RaffleBoxFactory,
  collectingTokenId?: string,
  ticketPrice: bigint = 10n,
) => {
  serviceBox.setContextExtension({
    0: SColl(SLong, winnersPercent),
    1: SColl(SColl(SByte), [
      Array.from(Buffer.from(implementerAddress)),
      Array.from(Buffer.from(creator.address.toString())),
    ]),
  });
  const serviceFeeAddress = Buffer.from(
    SConstant.from(serviceBox.additionalRegisters.R5!).data as Uint8Array,
  ).toString();
  const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
    .data as bigint[];
  const serviceFeePercent = serviceR4[0];
  const implementerFeePercent = serviceR4[1];
  const serviceOutputBox = boxFactory.createServiceOutputBox(
    serviceFeeAddress,
    serviceBox.assets[1].amount - 1n,
    serviceFeePercent,
    implementerFeePercent,
    serviceR4[2],
  );
  const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
  const inactiveRaffleOutputBox = boxFactory.createInactiveRaffleOutputBox(
    serviceFeeAddress,
    implementerAddress,
    creator.address.toString(),
    winnersCount,
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: 1n,
        }
      : undefined,
    winnersPercent,
    undefined,
    undefined,
    serviceR4[2],
    serviceBox.boxId,
    deadline,
    ticketPrice,
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
  winnersCount: bigint,
  deadline: bigint,
  boxFactory: testUtils.RaffleBoxFactory,
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
      BigInt(inactiveRaffle.value.toString()) -
        4n * winnersCount * testUtils.FEE -
        testUtils.FEE,
      BigInt(ticketRepo.assets[0].amount.toString()) - winnersCount - 1n,
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
 * @param boxFactory : mocked chain
 */
export const executeGiftTokenReceiptTx = (
  winner: testUtils.OutputBox,
  giftTokenRepo: testUtils.OutputBox,
  step: number,
  winnersCount: bigint,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const giftTokenId = giftTokenRepo.assets[0].tokenId;
  const ticketTokenId = winner.assets[0].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
  );
  const outputs = [outWinner];
  if (step < winnersCount)
    outputs.push(
      boxFactory.createGiftTokenRepoOutputBox(
        winnersCount,
        'add',
        step + 1,
        testUtils.FEE * (winnersCount - BigInt(step)),
        BigInt(testUtils.GIFT_TOKEN_COUNT) * (winnersCount - BigInt(step)),
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
 * @param boxFactory : mocked chain
 */
export const executeAddGiftTx = (
  winner: testUtils.OutputBox,
  giftGiver: KeyedMockChainParty,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const ticketTokenId = winner.assets[0].tokenId;
  const giftTokenId = winner.assets[1].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const giftCount = SConstant.from(winner.additionalRegisters.R5!)
    .data as bigint;
  const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    BigInt(winner.assets[1].amount.toString()) - 1n,
    giftCount + 1n,
  );
  const gift = boxFactory.createGiftOutputBox(
    winnerR4[0],
    giftGiver.address.toString(),
    testUtils.FEE * 10n,
    giftTokenId,
  );

  const addGiftTx = new TransactionBuilder(boxFactory.chain.height)
    .from([winner, ...giftGiver.utxos.toArray()])
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
 * @param boxFactory : mocked chain
 */
export const executeDonateTx = (
  activeRaffle: testUtils.OutputBox,
  donator: KeyedMockChainParty,
  ticketCount: bigint,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const r4 = SConstant.from(activeRaffle.additionalRegisters.R4!)
    .data as bigint[];
  const r5 = SConstant.from(activeRaffle.additionalRegisters.R5!)
    .data as Uint8Array[];
  const ticketTokenId = activeRaffle.assets[1].tokenId;
  const totalSoldTickets = (
    SConstant.from(activeRaffle.additionalRegisters.R6!).data as bigint[]
  )[0];

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
      activeRaffleOutputBoxValue,
      BigInt(activeRaffle.assets[1].amount.toString()) - ticketCount,
      ticketTokenId,
      totalSoldTickets + ticketCount,
      collectingToken,
    );

  const ticket = boxFactory.createTicketOutputBox(
    donator.address.toString(),
    ticketCount,
    ticketTokenId,
    [totalSoldTickets, totalSoldTickets + ticketCount, r4[3]],
  );

  const donateTx = new TransactionBuilder(boxFactory.chain.height)
    .from([activeRaffle, ...donator.utxos.toArray()])
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
 * @param boxFactory : mocked chain
 */
export const executeFailureTx = (
  activeRaffle: testUtils.OutputBox,
  raffleDetails: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const r4 = SConstant.from(activeRaffle.additionalRegisters.R4!)
    .data as bigint[];
  const ticketTokenId = activeRaffle.assets[1].tokenId;
  const totalSoldTickets = (
    SConstant.from(activeRaffle.additionalRegisters.R6!).data as bigint[]
  )[0];
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
    r4[4],
    1n,
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
 * @param boxFactory : mocked chain
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
  const giftCount = SConstant.from(winner.additionalRegisters.R5!)
    .data as bigint;
  const outWinner = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    BigInt(winner.assets[1].amount.toString()) + 1n,
    giftCount - 1n,
  );

  const giftGiverAddress = Buffer.from(
    SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
  ).toString();
  const redeemedGift = boxFactory.createCustomOutputBox(
    BigInt(gift.value.toString()) - testUtils.FEE,
    gift.assets.slice(1),
    giftGiverAddress,
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
 * @param boxFactory : mocked chain
 */
export const executeWinnerRemovalTx = (
  giftRedeem: testUtils.OutputBox,
  winner: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const r4 = SConstant.from(giftRedeem.additionalRegisters.R4!)
    .data as bigint[];
  const step = SConstant.from(giftRedeem.additionalRegisters.R5!)
    .data as bigint;
  const ticketTokenId = giftRedeem.assets[1].tokenId;
  const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
    BigInt(giftRedeem.value.toString()) + 2n * testUtils.FEE,
    r4[0],
    r4[1],
    r4[2],
    step + 1n,
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
    .payFee(testUtils.FEE);

  return boxFactory.chain.executeAndReturnOutputs(winnerRemovalTx.build());
};

/**
 * Forward to next step to redeem the tickets
 * @param giftRedeem
 * @param boxFactory : mocked chain
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
 * @param boxFactory : mocked chain
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
  const donatorAddress = Buffer.from(
    SConstant.from(ticket.additionalRegisters.R4!).data as Uint8Array,
  ).toString();

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
      amount: ticketCount,
    });
    ticketRedeemOutputBoxValue = BigInt(ticketRedeem.value.toString());
    collectingToken = {
      tokenId: ticketRedeem.assets[2].tokenId,
      amount: BigInt(ticketRedeem.assets[2].amount) - ticketCount,
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

  const redeemedDonation = boxFactory.createCustomOutputBox(
    redeemedDonationValue,
    redeemedDonationTokens,
    donatorAddress,
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
 * @param boxFactory : mocked chain
 */
export const executeReturnRaffleLicenseTx = (
  endedRaffle: testUtils.OutputBox,
  service: testUtils.OutputBox,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const serviceFeeAddress = Buffer.from(
    SConstant.from(service.additionalRegisters.R5!).data as Uint8Array,
  ).toString();
  const serviceR4 = SConstant.from(service.additionalRegisters.R4!)
    .data as bigint[];
  const serviceFeePercent = serviceR4[0];
  const implementerFeePercent = serviceR4[0];
  const serviceOutputBox = boxFactory.createServiceOutputBox(
    serviceFeeAddress,
    BigInt(service.assets[1].amount.toString()) + 1n,
    serviceFeePercent,
    implementerFeePercent,
    serviceR4[2],
  );
  const inputs = [service, endedRaffle];
  const outputs = [serviceOutputBox];
  const serviceValue = BigInt(endedRaffle.value) - testUtils.FEE;
  if (serviceValue > 0) {
    const serviceFee = boxFactory.createCustomOutputBox(
      serviceValue,
      [],
      serviceFeeAddress,
    );
    if (endedRaffle.assets.length > 2)
      serviceFee.addTokens([endedRaffle.assets[2]]);

    outputs.push(serviceFee);
  }
  const ticketRedeemTx = new TransactionBuilder(boxFactory.chain.height)
    .from(inputs)
    .to(outputs)
    // TODO must fix this problem
    // local/raffle-2/22
    .burnTokens(
      serviceValue === 0n && endedRaffle.assets.length > 2
        ? [endedRaffle.assets[1], endedRaffle.assets[2]]
        : endedRaffle.assets[1],
    )
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return boxFactory.chain.executeAndReturnOutputs(ticketRedeemTx);
};

/**
 * Execute reward transaction
 * @param activeRaffleBox
 * @param raffleDetailsBox
 * @param creatorAddress
 * @param serviceAddress
 * @param implementerAddress
 * @param creationFee
 * @param boxFactory
 * @returns
 */
export const executeRewardTx = (
  activeRaffleBox: testUtils.OutputBox,
  raffleDetailsBox: testUtils.OutputBox,
  creatorAddress: string,
  serviceAddress: string,
  implementerAddress: string,
  creationFee: bigint,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const oracleBox = boxFactory.createMockedOracleUTxO(testUtils.FEE);
  const r4 = SConstant.from(activeRaffleBox.additionalRegisters.R4!)
    .data as bigint[];
  const r6 = SConstant.from(activeRaffleBox.additionalRegisters.R6!)
    .data as bigint[];
  const winnersCount = Number(r4[6]);

  const totalSoldTickets = r6[0];
  const ticketPrice = r4[3];

  const totalRaised = totalSoldTickets * ticketPrice;
  const totalPrize = (totalRaised * (1000n - r4[0] - r4[1] - r4[2])) / 1000n;

  const seed = oracleBox.boxId.toString();
  const winnerIndexList: bigint[] = [];
  const hash = testUtils.makeHashFromString(winnerIndexList.toString());

  const charityFeePercent = r4[0];
  const serviceFeePercent = r4[1];
  const implementerFeePercent = r4[2];
  const winnerPercent =
    1000n - charityFeePercent - serviceFeePercent - implementerFeePercent;

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
  const serviceFeeBox = boxFactory.createCustomOutputBox(
    (isErgGoal ? BigInt((totalRaised * serviceFeePercent) / 1000n) : 0n) +
      testUtils.FEE,
    createTokenPercent(serviceFeePercent),
    serviceAddress,
  );
  const implementerFeeBox = boxFactory.createCustomOutputBox(
    (isErgGoal ? BigInt((totalRaised * implementerFeePercent) / 1000n) : 0n) +
      testUtils.FEE,
    createTokenPercent(serviceFeePercent),
    implementerAddress,
  );
  const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
    (isErgGoal ? BigInt((totalRaised * winnerPercent) / 1000n) : 0n) +
      testUtils.FEE,
    activeRaffleBox.assets[0].tokenId,
    seed,
    hash,
    BigInt(winnersCount),
    BigInt(totalPrize),
    BigInt(totalPrize) + 1n,
    0n,
    activeRaffleBox.assets[1].tokenId,
    // plus one token that exists on the Raffle-Details box
    BigInt(activeRaffleBox.assets[1].amount) + 1n,
    isErgGoal ? undefined : activeRaffleBox.assets[2].tokenId,
  );

  const creatorFundBox = testUtils.createChangeBox(
    [activeRaffleBox, raffleDetailsBox],
    [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
    testUtils.FEE,
    creatorAddress,
  );

  const rewardTx = new TransactionBuilder(boxFactory.chain.height)
    .from([activeRaffleBox, raffleDetailsBox])
    .to([
      successRaffleOutputBox,
      creatorFundBox,
      serviceFeeBox,
      implementerFeeBox,
    ])
    .withDataFrom([oracleBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .sendChangeTo(creatorAddress)
    .payFee(testUtils.FEE)
    .build();

  const result = boxFactory.chain.executeAndReturnOutputs(rewardTx);

  const unsignedOutputs = [];
  for (const outbox of result.outputs)
    unsignedOutputs.push(new ErgoUnsignedInput(outbox));
  return {
    success: result.success,
    outputs: unsignedOutputs,
    winnerIndexList: winnerIndexList,
  };
};

/**
 * Execute prize creation transaction
 * @param successRaffleBox
 * @param winnerBox
 * @param winnerTicketIndex
 * @param winnerIndexList
 * @param outputSeed
 * @param boxFactory
 * @returns
 */
export const executePrizeCreationTx = (
  successRaffleBox: ErgoUnsignedInput,
  winnerBox: testUtils.OutputBox,
  winnerTicketIndex: number,
  winnerIndexList: bigint[],
  outputSeed: string,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  successRaffleBox.setContextExtension({
    0: SColl(SLong, [...winnerIndexList]),
    1: SLong(BigInt(winnerTicketIndex)),
  });

  const successRaffleR4 = SConstant.from(
    successRaffleBox.additionalRegisters.R4!,
  ).data as bigint[];
  const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
    .data as bigint[];

  const winnersCount = successRaffleR4[0];
  const totalPrize = successRaffleR4[2];

  const giftCount = SConstant.from(winnerBox.additionalRegisters.R5!)
    .data as bigint;

  const prizeAmount = (BigInt(totalPrize) * winnerR4[1]) / 1000n;
  const isErgGoal = successRaffleBox.assets.length == 2;
  const prizeBox = boxFactory.createWinnerPrizeOutputBox(
    isErgGoal
      ? testUtils.FEE * 2n + (totalPrize * winnerR4[1]) / 1000n
      : testUtils.FEE * 2n,
    winnerR4[0],
    BigInt(winnerTicketIndex),
    BigInt(giftCount),
    0n,
    isErgGoal
      ? [winnerBox.assets[0], winnerBox.assets[1]]
      : [
          winnerBox.assets[0],
          winnerBox.assets[1],
          {
            tokenId: successRaffleBox.assets[2].tokenId,
            amount: prizeAmount,
          },
        ],
  );

  winnerIndexList.push(BigInt(winnerTicketIndex));
  const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
    isErgGoal ? successRaffleBox.value - prizeAmount : successRaffleBox.value,
    successRaffleBox.assets[0].tokenId,
    outputSeed,
    testUtils.makeHashFromString(winnerIndexList.toString()),
    BigInt(winnersCount),
    totalPrize,
    isErgGoal ? 0n : successRaffleBox.assets[2].amount - prizeAmount,
    BigInt(winnerIndexList.length),
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
  prizeNumber: bigint,
  boxFactory: testUtils.RaffleBoxFactory,
) => {
  const winnerPrizeR4 = SConstant.from(winnerPrizeBox.additionalRegisters.R4!)
    .data as bigint[];

  const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
    BigInt(winnerPrizeBox.value),
    winnerPrizeR4[1],
    winnerPrizeR4[0],
    winnerPrizeR4[2],
    prizeNumber,
    winnerPrizeBox.assets,
  );

  const giftOutputBoxTokens = giftForWinnerBox.assets.slice(
    1,
    giftForWinnerBox.assets.length,
  );

  const unwrappedGiftBox = boxFactory.createCustomOutputBox(
    BigInt(giftForWinnerBox.value) - testUtils.FEE,
    giftOutputBoxTokens,
    Buffer.from(
      SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
    ).toString(),
  );

  const giftUnwrapTx = new TransactionBuilder(boxFactory.chain.height)
    .from([winnerPrizeBox, giftForWinnerBox])
    .to([prizeOutputBox, unwrappedGiftBox])
    .burnTokens([giftForWinnerBox.assets[0]])
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
  const finalPrizeSpendingBox = boxFactory.createCustomOutputBox(
    BigInt(winnerPrizeBox.value) - testUtils.FEE,
    winnerPrizeBox.assets.length > 2 ? [winnerPrizeBox.assets[2]] : [],
    Buffer.from(
      SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
    ).toString(),
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
