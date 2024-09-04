import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SColl, SByte, SLong, SConstant } from '@fleet-sdk/serializer';
import { TransactionBuilder, ErgoUnsignedInput, ErgoAddress, TokenAmount, Amount, Box } from '@fleet-sdk/core';

import * as testUtils from '../../testUtils';

/**
 * Create a new raffle using the specified parameters
 * @param creator: raffle creator wallet
 * @param serviceBox: current service box
 * @param feeBoxes
 * @param implementerAddress
 * @param winnersCount
 * @param deadline
 * @param winnersPercent
 * @param chain: mocked chain
 * @param collectingTokenId
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
  chain: testUtils.RaffleMockChain,
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
  const serviceOutputBox = testUtils.createServiceOutputBox(
    serviceFeeAddress,
    serviceBox.assets[1].amount - 1n,
    serviceFeePercent,
    implementerFeePercent,
    serviceR4[2]
  );
  const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
  const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
    serviceFeeAddress,
    implementerAddress,
    creator.address.toString(),
    winnersCount,
    collectingTokenId !== undefined ? {
      tokenId: collectingTokenId,
      amount: 1n
    } : undefined,
    winnersPercent,
    undefined,
    undefined,
    serviceR4[2],
    serviceBox.boxId,
    deadline,
    ticketPrice
  );
  const creationTx = new TransactionBuilder(chain.height)
    .from([serviceBox, ...feeBoxes])
    .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .sendChangeTo(creator.address)
    .build();
  return chain.executeAndReturnOutputs(creationTx, {
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
 * @param chain: mocked chain
 */
export const executeMergeTx = (
  inactiveRaffle: testUtils.OutputBox,
  ticketRepo: testUtils.OutputBox,
  winnersCount: bigint,
  deadline: bigint,
  chain: testUtils.RaffleMockChain,
) => {
  const r4 = SConstant.from(inactiveRaffle.additionalRegisters.R4!)
    .data as bigint[];
  const r5 = SConstant.from(inactiveRaffle.additionalRegisters.R5!)
    .data as Uint8Array[];
  const ticketTokenId = ticketRepo.assets[0].tokenId;
  const activeRaffleOutputBox =
    testUtils.createActiveRaffleWithConstantRegisters(
      r4,
      r5,
      BigInt(inactiveRaffle.value.toString()) -
        4n * winnersCount * testUtils.FEE -
        testUtils.FEE,
      BigInt(ticketRepo.assets[0].amount.toString()) - winnersCount - 1n,
      ticketTokenId,
      0n,
      inactiveRaffle.assets.length > 1 ? 
      {
        tokenId: inactiveRaffle.assets[1].tokenId,
        amount: BigInt(inactiveRaffle.assets[1].amount)
      } : undefined
    );
  const raffleDetailsOutputBox =
    testUtils.createRaffleDetailsOutputBox(ticketTokenId);
  const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
    winnersCount,
    'mint',
    undefined,
    undefined,
    undefined,
    ticketTokenId,
  );

  const winnersBoxes = testUtils.createWinnersOutputBox(
    winnersCount,
    inactiveRaffle.boxId.toString(),
    ticketTokenId,
    undefined,
    deadline,
  );

  const inactiveRaffleTx = new TransactionBuilder(chain.height)
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

  return chain.executeAndReturnOutputs(inactiveRaffleTx);
};

/**
 * Move gift tokens from giftTokenRepo to empty winner boxes
 * This transaction activates the winners gifts
 * @param winner
 * @param giftTokenRepo
 * @param step
 * @param winnersCount
 * @param chain: mocked chain
 */
export const executeGiftTokenReceiptTx = (
  winner: testUtils.OutputBox,
  giftTokenRepo: testUtils.OutputBox,
  step: number,
  winnersCount: bigint,
  chain: testUtils.RaffleMockChain,
) => {
  const giftTokenId = giftTokenRepo.assets[0].tokenId;
  const ticketTokenId = winner.assets[0].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
  );
  const outputs = [outWinner];
  if (step < winnersCount)
    outputs.push(
      testUtils.createGiftTokenRepoOutputBox(
        winnersCount,
        'add',
        step + 1,
        testUtils.FEE * (winnersCount - BigInt(step)),
        BigInt(testUtils.GIFT_TOKEN_COUNT) * (winnersCount - BigInt(step)),
        ticketTokenId,
        giftTokenId,
      ),
    );

  const giftTokenReceiptTx = new TransactionBuilder(chain.height)
    .from([winner, giftTokenRepo])
    .to(outputs)
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(giftTokenReceiptTx);
};

/**
 * Add gift to a selected winner
 * @param winner
 * @param giftGiver: gift giver wallet
 * @param chain: mocked chain
 */
export const executeAddGiftTx = (
  winner: testUtils.OutputBox,
  giftGiver: KeyedMockChainParty,
  chain: testUtils.RaffleMockChain,
) => {
  const ticketTokenId = winner.assets[0].tokenId;
  const giftTokenId = winner.assets[1].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const giftCount = SConstant.from(winner.additionalRegisters.R5!)
    .data as bigint;
  const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    BigInt(winner.assets[1].amount.toString()) - 1n,
    giftCount + 1n,
  );
  const gift = testUtils.createGiftOutputBox(
    winnerR4[0],
    giftTokenId,
    giftGiver.address.toString(),
    testUtils.FEE * 10n,
  );

  const addGiftTx = new TransactionBuilder(chain.height)
    .from([winner, ...giftGiver.utxos.toArray()])
    .to([outWinner, gift])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .sendChangeTo(giftGiver.address)
    .build();

  return chain.executeAndReturnOutputs(addGiftTx, { signers: [giftGiver] });
};

/**
 * Donate to raffle and receive ticket with the new range
 * @param activeRaffle
 * @param donator: donator wallet
 * @param ticketCount
 * @param chain: mocked chain
 */
export const executeDonateTx = (
  activeRaffle: testUtils.OutputBox,
  donator: KeyedMockChainParty,
  ticketCount: bigint,
  chain: testUtils.RaffleMockChain,
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
  let activeRaffleOutputBoxValue = BigInt(activeRaffle.value) + (
    ticketCount * ticketPrice
  );
  if(activeRaffle.assets.length > 2) {
    collectingToken = {
      tokenId: testUtils.X_TOKEN_ID,
      amount: (ticketPrice * ticketCount) + BigInt(activeRaffle.assets[2].amount)
    };
    activeRaffleOutputBoxValue = BigInt(activeRaffle.value.toString());
  }

  const activeRaffleOutputBox =
    testUtils.createActiveRaffleWithConstantRegisters(
      r4,
      r5,
      activeRaffleOutputBoxValue,
      BigInt(activeRaffle.assets[1].amount.toString()) - ticketCount,
      ticketTokenId,
      totalSoldTickets + ticketCount,
      collectingToken
    );

  const ticket = testUtils.createTicketOutputBox(
    donator.address.toString(),
    ticketCount,
    ticketTokenId,
    [totalSoldTickets, totalSoldTickets + ticketCount, r4[3]],
  );

  const donateTx = new TransactionBuilder(chain.height)
    .from([activeRaffle, ...donator.utxos.toArray()])
    .to([activeRaffleOutputBox, ticket])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .sendChangeTo(donator.address)
    .build();

  return chain.executeAndReturnOutputs(donateTx, { signers: [donator] });
};

/**
 * Change raffle status from active to failed after deadline
 * @param activeRaffle
 * @param raffleDetails
 * @param chain: mocked chain
 */
export const executeFailureTx = (
  activeRaffle: testUtils.OutputBox,
  raffleDetails: testUtils.OutputBox,
  chain: testUtils.RaffleMockChain,
) => {
  const r4 = SConstant.from(activeRaffle.additionalRegisters.R4!)
    .data as bigint[];
  const ticketTokenId = activeRaffle.assets[1].tokenId;
  const totalSoldTickets = (
    SConstant.from(activeRaffle.additionalRegisters.R6!).data as bigint[]
  )[0];
  const collectingToken = activeRaffle.assets.length > 2 ? {
    tokenId: activeRaffle.assets[2].tokenId,
    amount: BigInt(activeRaffle.assets[2].amount)
  } : undefined;
  const giftRedeemOutputBox = testUtils.createGiftRedeemOutputBox(
    BigInt(activeRaffle.value) + BigInt(raffleDetails.value) - testUtils.FEE,
    totalSoldTickets,
    r4[3],
    r4[4],
    1n,
    ticketTokenId,
    // added by one token on the raffle-details box
    BigInt(activeRaffle.assets[1].amount.toString()) + 1n, 
    collectingToken
  );

  const failureTx = new TransactionBuilder(chain.height)
    .from([activeRaffle, raffleDetails])
    .to([giftRedeemOutputBox])
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(failureTx);
};

/**
 * Return the gift to the gift giver
 * @param giftRedeem
 * @param winner
 * @param gift
 * @param chain: mocked chain
 */
export const executeGiftReturnTx = (
  giftRedeem: testUtils.OutputBox,
  winner: testUtils.OutputBox,
  gift: testUtils.OutputBox,
  chain: testUtils.RaffleMockChain,
) => {
  const ticketTokenId = winner.assets[0].tokenId;
  const giftTokenId = winner.assets[1].tokenId;
  const winnerR4 = SConstant.from(winner.additionalRegisters.R4!)
    .data as bigint[];
  const giftCount = SConstant.from(winner.additionalRegisters.R5!)
    .data as bigint;
  const outWinner = testUtils.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    BigInt(winner.assets[1].amount.toString()) + 1n,
    giftCount - 1n,
  );

  const giftGiverAddress = Buffer.from(
    SConstant.from(gift.additionalRegisters.R4!).data as Uint8Array,
  ).toString();
  const redeemedGift = testUtils.createCustomOutputBox(
    BigInt(gift.value.toString()) - testUtils.FEE,
    gift.assets.slice(1),
    giftGiverAddress,
  );
  const giftReturnTx = new TransactionBuilder(chain.height)
    .from([winner, gift])
    .to([outWinner, redeemedGift])
    .withDataFrom([giftRedeem])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(giftReturnTx);
};

/**
 * Remove the winner box after returning all related gifts
 * @param giftRedeem
 * @param winner
 * @param chain: mocked chain
 */
export const executeWinnerRemovalTx = (
  giftRedeem: testUtils.OutputBox,
  winner: testUtils.OutputBox,
  chain: testUtils.RaffleMockChain,
) => {
  const r4 = SConstant.from(giftRedeem.additionalRegisters.R4!)
    .data as bigint[];
  const step = SConstant.from(giftRedeem.additionalRegisters.R5!)
    .data as bigint;
  const ticketTokenId = giftRedeem.assets[1].tokenId;
  const giftRedeemOutputBox = testUtils.createGiftRedeemOutputBox(
    BigInt(giftRedeem.value.toString()) + 2n * testUtils.FEE,
    r4[0],
    r4[1],
    r4[2],
    step + 1n,
    ticketTokenId,
    BigInt(giftRedeem.assets[1].amount.toString()) + 1n,
  );

  const winnerRemovalTx = new TransactionBuilder(chain.height)
    .from([giftRedeem, winner])
    .to([giftRedeemOutputBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .burnTokens(winner.assets[1]!)
    .payFee(testUtils.FEE)

  return chain.executeAndReturnOutputs(winnerRemovalTx.build());
};

/**
 * Forward to next step to redeem the tickets
 * @param giftRedeem
 * @param chain: mocked chain
 * @returns
 */
export const executeForwardToTicketRedeemTx = (
  giftRedeem: testUtils.OutputBox,
  chain: testUtils.RaffleMockChain,
) => {
  const r4 = SConstant.from(giftRedeem.additionalRegisters.R4!)
    .data as bigint[];
  const ticketRedeemOutputBox = testUtils.createTicketRedeemOutputBox(
    BigInt(giftRedeem.value.toString()) - testUtils.FEE,
    r4[0],
    r4[1],
    0n,
    giftRedeem.assets[1].tokenId,
    BigInt(giftRedeem.assets[1].amount.toString()),
  );

  if(giftRedeem.assets.length > 2)
    ticketRedeemOutputBox.assets.add(giftRedeem.assets[2])

  const forwardToTicketRedeemTx = new TransactionBuilder(chain.height)
    .from([giftRedeem])
    .to([ticketRedeemOutputBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(forwardToTicketRedeemTx);
};

/**
 * Return ticket tokens and redeem donation to the donator
 * @param ticketRedeem
 * @param ticket
 * @param chain: mocked chain
 */
export const executeTicketRedeemTx = (
  ticketRedeem: testUtils.OutputBox,
  ticket: testUtils.OutputBox,
  chain: testUtils.RaffleMockChain,
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

  let redeemedDonationValue = BigInt(ticket.value.toString()) - testUtils.FEE + ticketPrice * ticketCount;
  const redeemedDonationTokens = [];
  let collectingToken: TokenAmount<bigint> | undefined = undefined;
  let ticketRedeemOutputBoxValue = BigInt(ticketRedeem.value.toString()) - ticketPrice * ticketCount;
  if(ticketRedeem.assets.length > 2) {
    redeemedDonationValue = BigInt(ticket.value.toString()) - testUtils.FEE;

    redeemedDonationTokens.push({
      tokenId: ticketRedeem.assets[2].tokenId,
      amount: ticketCount
    });
    ticketRedeemOutputBoxValue = BigInt(ticketRedeem.value.toString());
    collectingToken = {
      tokenId: ticketRedeem.assets[2].tokenId,
      amount: BigInt(ticketRedeem.assets[2].amount) - ticketCount
    };
  }

  const ticketRedeemOutputBox = testUtils.createTicketRedeemOutputBox(
    ticketRedeemOutputBoxValue,
    r4[0],
    r4[1],
    redeemedTickets + ticketCount,
    ticketRedeem.assets[1].tokenId,
    BigInt(ticketRedeem.assets[1].amount.toString()) + ticketCount,
    collectingToken
  );

  const redeemedDonation = testUtils.createCustomOutputBox(
    redeemedDonationValue,
    redeemedDonationTokens,
    donatorAddress,
  );

  const ticketRedeemTx = new TransactionBuilder(chain.height)
    .from([ticketRedeem, ticket])
    .to([ticketRedeemOutputBox, redeemedDonation])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(ticketRedeemTx);
};

/**
 * Return raffle license to the service box after raffle completion
 * @param endedRaffle
 * @param service
 * @param chain: mocked chain
 */
export const executeReturnRaffleLicenseTx = (
  endedRaffle: testUtils.OutputBox,
  service: testUtils.OutputBox,
  chain: testUtils.RaffleMockChain,
) => {
  const serviceFeeAddress = Buffer.from(
    SConstant.from(service.additionalRegisters.R5!).data as Uint8Array,
  ).toString();
  const serviceR4 = SConstant.from(service.additionalRegisters.R4!)
    .data as bigint[];
  const serviceFeePercent = serviceR4[0];
  const implementerFeePercent = serviceR4[0];
  const serviceOutputBox = testUtils.createServiceOutputBox(
    serviceFeeAddress,
    BigInt(service.assets[1].amount.toString()) + 1n,
    serviceFeePercent,
    implementerFeePercent,
    serviceR4[2],
  );
  const serviceFee = testUtils.createCustomOutputBox(
    BigInt(endedRaffle.value) - testUtils.FEE,
    [],
    serviceFeeAddress,
  );

  if(endedRaffle.assets.length > 2)
    serviceFee.addTokens([endedRaffle.assets[2]]);

  const ticketRedeemTx = new TransactionBuilder(chain.height)
    .from([service, endedRaffle])
    .to([serviceOutputBox, serviceFee])
    .burnTokens(endedRaffle.assets[1])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(ticketRedeemTx);
};

/**
 * Execute reward transaction
 * @param activeRaffleBox
 * @param raffleDetailsBox
 * @param creatorAddress
 * @param serviceAddress
 * @param implementerAddress
 * @param winnersCount
 * @param totalPrize
 * @param seed
 * @param selectedWinnersListHash
 * @param chain
 * @param successRaffleAddress
 * @returns 
 */
export const executeRewardTx = (
  activeRaffleBox: testUtils.OutputBox,
  raffleDetailsBox: testUtils.OutputBox,
  creatorAddress: string,
  serviceAddress: string,
  implementerAddress: string,
  winnersCount: number,
  totalPrize: number,
  seed: string,
  selectedWinnersListHash: string,
  chain: testUtils.RaffleMockChain,
  successRaffleAddress: string = testUtils.contractsAddresses["successRaffle"],
) => {
  const r4 = SConstant.from(activeRaffleBox.additionalRegisters.R4!)
    .data as bigint[];
  // const r5 = SConstant.from(activeRaffleBox.additionalRegisters.R5!)
  //   .data as Uint8Array[];

  const charityFeePercent = r4[0];
  const serviceFeePercent = r4[1];
  const implementerFeePercent = r4[2];
  const creatorFeePercent = 1000n - charityFeePercent - serviceFeePercent - implementerFeePercent;

  const oracleBox = testUtils.createMockedOracleUTxO(testUtils.FEE, []);

  let successRaffleOutputBox = testUtils.createCustomOutputBox(
    (BigInt(activeRaffleBox.value) - testUtils.FEE) * charityFeePercent / 1000n + testUtils.FEE,
    [
      activeRaffleBox.assets[0],
      {
        tokenId: activeRaffleBox.assets[1].tokenId,
        // plus one token that exists on the Raffle-Details box
        amount: BigInt(activeRaffleBox.assets[1].amount) + 1n
      }
    ],
    ErgoAddress.fromErgoTree(successRaffleAddress).toString(),
    {
      R4: SColl(SLong, [BigInt(winnersCount), testUtils.FEE, BigInt(totalPrize)]).toHex(),
      R5: SColl(SColl(SByte), [Array.from(Buffer.from(seed)), Array.from(Buffer.from(selectedWinnersListHash))]),
      R6: SLong(0n)
    }
  );
  let creatorFundBox = testUtils.createCustomOutputBox(
    (BigInt(activeRaffleBox.value) - testUtils.FEE) * creatorFeePercent / 1000n,
    [],
    creatorAddress
  );
  let serviceFeeBox = testUtils.createCustomOutputBox(
    (BigInt(activeRaffleBox.value) - testUtils.FEE) * serviceFeePercent / 1000n,
    [],
    serviceAddress
  );
  let implementerFeeBox = testUtils.createCustomOutputBox(
    (BigInt(activeRaffleBox.value) - testUtils.FEE) * implementerFeePercent / 1000n,
    [],
    implementerAddress
  );
  if(activeRaffleBox.assets.length > 2) {
    successRaffleOutputBox = testUtils.createCustomOutputBox(
      BigInt(activeRaffleBox.value) - (testUtils.FEE * 3n),
      [
        activeRaffleBox.assets[0],
        {
          tokenId: activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          amount: BigInt(activeRaffleBox.assets[1].amount) + 1n
        },
        {
          tokenId: activeRaffleBox.assets[2].tokenId,
          // One extra collecting token added to this box
          amount: ((BigInt(activeRaffleBox.assets[2].amount)) * charityFeePercent / 1000n) + 1n
        }
      ],
      ErgoAddress.fromErgoTree(successRaffleAddress).toString(),
      {
        R4: SColl(SLong, [BigInt(winnersCount), testUtils.FEE, BigInt(totalPrize)]).toHex(),
        R5: SColl(SColl(SByte), [Array.from(Buffer.from(seed)), Array.from(Buffer.from(selectedWinnersListHash))]),
        R6: SLong(0n)
      }
    );
    creatorFundBox = testUtils.createCustomOutputBox(
      testUtils.FEE,
      [{
        tokenId: activeRaffleBox.assets[2].tokenId,
        amount: (BigInt(activeRaffleBox.assets[2].amount)) * creatorFeePercent / 1000n
      }],
      creatorAddress
    );
    serviceFeeBox = testUtils.createCustomOutputBox(
      testUtils.FEE,
      [{
        tokenId: activeRaffleBox.assets[2].tokenId,
        amount: (BigInt(activeRaffleBox.assets[2].amount)) * serviceFeePercent / 1000n
      }],
      serviceAddress
    );
    implementerFeeBox = testUtils.createCustomOutputBox(
      testUtils.FEE,
      [{
        tokenId: activeRaffleBox.assets[2].tokenId,
        amount: (BigInt(activeRaffleBox.assets[2].amount)) * implementerFeePercent / 1000n
      }],
      implementerAddress
    );
  }

  const rewardTx = new TransactionBuilder(chain.height)
    .from([activeRaffleBox, raffleDetailsBox])
    .to([successRaffleOutputBox, creatorFundBox, serviceFeeBox, implementerFeeBox])
    .withDataFrom([oracleBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(rewardTx);
}

/**
 * Execute prize creation transaction
 * @param successRaffleBox
 * @param winnerBox
 * @param winnersCount
 * @param totalPrize
 * @param ticketIndex
 * @param giftCount
 * @param seed
 * @param selectedWinnersListHash
 * @param step
 * @param chain
 * @param prizeErgoTree
 * @returns
 */
export const executePrizeCreationTx = (
  successRaffleBox: testUtils.OutputBox,
  winnerBox: testUtils.OutputBox,
  winnersCount: number,
  totalPrize: number,
  ticketIndex: number,
  giftCount: number,
  seed: string,
  selectedWinnersListHash: string,
  step: number,
  chain: testUtils.RaffleMockChain,
  prizeErgoTree: string = testUtils.contractsAddresses['winnerPrize'],
) => {
  const successRaffleOutputBoxTokens = [
    successRaffleBox.assets[0],
    successRaffleBox.assets[1],
  ];

  const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
    .data as bigint[];

  const prizeAmount = BigInt(totalPrize) * BigInt(winnerR4[1]) / 1000n;
  const prizeBoxTokens: TokenAmount<Amount>[] = [
    winnerBox.assets[0],
    winnerBox.assets[1],
  ];
  let prizeBoxValue = testUtils.FEE * 2n + BigInt(prizeAmount);
  let successRaffleBoxValue = BigInt(successRaffleBox.value) - BigInt(prizeAmount);
  if(successRaffleBox.assets.length > 2) {
    successRaffleBoxValue = BigInt(successRaffleBox.value);
    prizeBoxValue = testUtils.FEE * 2n;
    prizeBoxTokens.push({
      tokenId: successRaffleBox.assets[2].tokenId,
      amount:  prizeAmount
    });
    if(BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount) > 0)
      successRaffleOutputBoxTokens.push({
        tokenId: successRaffleBox.assets[2]!.tokenId,
        amount: BigInt(successRaffleBox.assets[2]!.amount) - BigInt(prizeAmount)
      });
  }
  const prizeBox = testUtils.createCustomOutputBox(
    prizeBoxValue,
    prizeBoxTokens,
    prizeErgoTree,
    {
      R4: SColl(SLong, [BigInt(ticketIndex), winnerBox.additionalRegisters.R4![0], BigInt(giftCount)]).toHex(),
      R5: SLong(0n),
    }
  );

  const successRaffleOutputBox = testUtils.createCustomOutputBox(
    successRaffleBoxValue,
    successRaffleOutputBoxTokens,
    successRaffleBox.ergoTree,
    {
      R4: SColl(SLong, [BigInt(winnersCount), testUtils.FEE, BigInt(totalPrize)]).toHex(),
      R5: SColl(SColl(SByte), [Array.from(Buffer.from(seed)), Array.from(Buffer.from(selectedWinnersListHash))]),
      R6: SLong(BigInt(step))
    }
  );

  const prizeTx = new TransactionBuilder(chain.height)
    .from([successRaffleBox, winnerBox])
    .to([successRaffleOutputBox, prizeBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .payFee(testUtils.FEE)
    .build();
  return chain.executeAndReturnOutputs(prizeTx);
}

/**
 * Execute gift unwrap transaction
 * @param winnerPrizeBox
 * @param giftForWinnerBox
 * @param ticketBox
 * @param prizeNumber
 * @param chain
 * @returns
 */
export const executeGiftUnwrapTx = (
  winnerPrizeBox: testUtils.OutputBox,
  giftForWinnerBox: testUtils.OutputBox,
  ticketBox: testUtils.OutputBox,
  prizeNumber: bigint,
  chain: testUtils.RaffleMockChain,
) => {
  const prizeOutputBox = testUtils.createCustomOutputBox(
    BigInt(winnerPrizeBox.value),
    winnerPrizeBox.assets,
    winnerPrizeBox.ergoTree,
    {
      R4: winnerPrizeBox.additionalRegisters.R4,
      R5: SLong(prizeNumber),
    }
  );

  const giftOutputBoxTokens = [];
  let giftOutputBoxValue = testUtils.FEE;
  if(giftForWinnerBox.assets.length > 1) {
    giftOutputBoxTokens.push(giftForWinnerBox.assets[1]);
  } else {
    giftOutputBoxValue = BigInt(giftForWinnerBox.value) - testUtils.FEE;
  }
  const giftOutputBox = testUtils.createCustomOutputBox(
    giftOutputBoxValue,
    giftOutputBoxTokens,
    new TextDecoder().decode(SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array),
    {
      R4: winnerPrizeBox.additionalRegisters.R4,
      R5: SLong(prizeNumber),
    }
  );

  const giftUnwrapTx = new TransactionBuilder(chain.height)
    .from([winnerPrizeBox, giftForWinnerBox])
    .to([prizeOutputBox, giftOutputBox])
    .burnTokens([giftForWinnerBox.assets[0]])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .withDataFrom([ticketBox])
    .payFee(testUtils.FEE)
    .build();
  return chain.executeAndReturnOutputs(giftUnwrapTx);
}

/**
 * Execute final prize transaction
 * @param winnerPrizeBox
 * @param ticketBox
 * @param prizeNumber
 * @param chain
 * @returns
 */
export const executeFinalPrizeTx = (
  winnerPrizeBox: testUtils.OutputBox,
  ticketBox: testUtils.OutputBox,
  chain: testUtils.RaffleMockChain,
) => {
  const finalPrizeBox = testUtils.createCustomOutputBox(
    BigInt(winnerPrizeBox.value) - testUtils.FEE,
    winnerPrizeBox.assets.length > 2 ? [winnerPrizeBox.assets[2]] : [],
    new TextDecoder().decode(SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array),
  );

  const finalPrizeTx = new TransactionBuilder(chain.height)
    .from([winnerPrizeBox])
    .to([finalPrizeBox])
    .configureSelector((selector) => {
      selector.defineStrategy((inputs) => inputs);
    })
    .withDataFrom([ticketBox])
    .burnTokens(winnerPrizeBox.assets.slice(0, 2))
    .payFee(testUtils.FEE)
    .build();
  return chain.executeAndReturnOutputs(finalPrizeTx);
}
