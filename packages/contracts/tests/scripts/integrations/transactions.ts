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
