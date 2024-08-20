import { TransactionBuilder, ErgoUnsignedInput } from '@fleet-sdk/core';
import * as testUtils from '../../testUtils';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SColl, SByte, SLong, SConstant } from '@fleet-sdk/serializer';
import { Box } from '@fleet-sdk/common';

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
 * @returns the create raffle signed transaction and success status
 */
export const CreateRaffleTx = (
  creator: KeyedMockChainParty,
  serviceBox: ErgoUnsignedInput,
  feeBoxes: Box<bigint>[],
  implementerAddress: string,
  winnersCount: bigint,
  deadline: bigint,
  winnersPercent: Array<bigint>,
  chain: testUtils.RaffleMockChain,
) => {
  serviceBox.setContextExtension({
    0: SColl(SLong, winnersPercent),
    1: SColl(SColl(SByte), [
      Array.from(Buffer.from(implementerAddress)),
      Array.from(Buffer.from(creator.address.toString())),
    ]),
  });
  const serviceAddress = Buffer.from(
    SConstant.from(serviceBox.additionalRegisters.R5!).data as Uint8Array,
  ).toString();
  const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
    .data as bigint[];
  const serviceFeePercent = serviceR4[0];
  const implementerFeePercent = serviceR4[0];
  const serviceOutputBox = testUtils.createServiceOutputBox(
    serviceAddress,
    serviceBox.assets[1].amount - 1n,
    serviceFeePercent,
    implementerFeePercent,
    testUtils.CREATION_FEE,
  );
  const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
  const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
    serviceAddress,
    implementerAddress,
    creator.address.toString(),
    winnersCount,
    undefined,
    winnersPercent,
    undefined,
    undefined,
    testUtils.CREATION_FEE,
    serviceBox.boxId,
    deadline,
  );
  const creationTx = new TransactionBuilder(chain.height)
    .from([serviceBox, ...feeBoxes])
    .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
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
export const MergeTx = (
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
        3n * winnersCount * testUtils.FEE -
        testUtils.FEE,
      BigInt(ticketRepo.assets[0].amount.toString()) - winnersCount - 1n,
      ticketTokenId,
      0n,
    );
  const raffleDetailsOutputBox =
    testUtils.createRaffleDetailsOutputBox(ticketTokenId);
  const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
    2,
    'mint',
    undefined,
    undefined,
    undefined,
    ticketTokenId,
  );

  const winnersBoxes = testUtils.createWinnersOutputBox(
    2n,
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
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(inactiveRaffleTx);
};

/**
 * Move gift tokens from giftTokenRepo to empty winner boxes
 * This transaction activates the winners gifts
 * @param winnerBox
 * @param giftTokenRepo
 * @param step
 * @param winnersCount
 * @param chain: mocked chain
 */
export const GiftTokenReceiptTx = (
  winnerBox: testUtils.OutputBox,
  giftTokenRepo: testUtils.OutputBox,
  step: number,
  winnersCount: bigint,
  chain: testUtils.RaffleMockChain,
) => {
  const giftTokenId = giftTokenRepo.assets[0].tokenId;
  const ticketTokenId = winnerBox.assets[0].tokenId;
  const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
    .data as bigint[];
  const outWinnerBox = testUtils.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
  );
  const outputs = [outWinnerBox];
  if (step < winnersCount)
    outputs.push(
      testUtils.createGiftTokenRepoOutputBox(
        2,
        'add',
        step + 1,
        testUtils.FEE * (winnersCount - BigInt(step)),
        BigInt(testUtils.GIFT_TOKEN_COUNT) * (winnersCount - BigInt(step)),
        ticketTokenId,
        giftTokenId,
      ),
    );

  const giftTokenReceiptTx = new TransactionBuilder(chain.height)
    .from([winnerBox, giftTokenRepo])
    .to(outputs)
    .payFee(testUtils.FEE)
    .build();

  return chain.executeAndReturnOutputs(giftTokenReceiptTx);
};

/**
 * Add gift to a selected winner
 * @param winnerBox
 * @param giftGiver: gift giver wallet
 * @param chain: mocked chain
 * @returns
 */
export const AddGiftTx = (
  winnerBox: testUtils.OutputBox,
  giftGiver: KeyedMockChainParty,
  chain: testUtils.RaffleMockChain,
) => {
  const ticketTokenId = winnerBox.assets[0].tokenId;
  const giftTokenId = winnerBox.assets[1].tokenId;
  const winnerR4 = SConstant.from(winnerBox.additionalRegisters.R4!)
    .data as bigint[];
  const giftCount = SConstant.from(winnerBox.additionalRegisters.R5!)
    .data as bigint;
  const outWinnerBox = testUtils.createWinnerOutputBoxWithConstantRegisters(
    winnerR4,
    ticketTokenId,
    giftTokenId,
    BigInt(winnerBox.assets[1].amount.toString()) - 1n,
    giftCount + 1n,
  );
  const gift = testUtils.createGiftOutputBox(
    winnerR4[0],
    giftTokenId,
    giftGiver.address.toString(),
    testUtils.FEE * 10n,
  );

  const addGiftTx = new TransactionBuilder(chain.height)
    .from([winnerBox, ...giftGiver.utxos.toArray()])
    .to([outWinnerBox, gift])
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
 * @returns
 */
export const DonateTx = (
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
  const activeRaffleOutputBox =
    testUtils.createActiveRaffleWithConstantRegisters(
      r4,
      r5,
      BigInt(activeRaffle.value.toString()),
      BigInt(activeRaffle.assets[1].amount.toString()) - ticketCount,
      ticketTokenId,
      totalSoldTickets + ticketCount,
    );

  const ticket = testUtils.createTicketOutputBox(
    donator.address.toString(),
    ticketCount,
    ticketTokenId,
    [totalSoldTickets, totalSoldTickets + ticketCount, r4[0]],
  );

  const donateTx = new TransactionBuilder(chain.height)
    .from([activeRaffle, ...donator.utxos.toArray()])
    .to([activeRaffleOutputBox, ticket])
    .payFee(testUtils.FEE)
    .sendChangeTo(donator.address)
    .build();

  return chain.executeAndReturnOutputs(donateTx, { signers: [donator] });
};
