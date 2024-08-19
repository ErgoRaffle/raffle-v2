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
 * Create a new merge transaction to merge inactive raffle and ticket repo
 * and create the active raffle with winner boxes
 * @param inactiveRaffle
 * @param ticketRepo
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
