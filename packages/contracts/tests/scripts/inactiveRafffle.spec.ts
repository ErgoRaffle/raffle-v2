import { it, describe, expect } from 'vitest';
import { MockChain } from '@fleet-sdk/mock-chain';
import { SColl, SLong } from '@fleet-sdk/serializer';
import { TransactionBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';
import { X_TOKEN_ID, CREATOR_DEFAULT_BALANCE, ROSEN_DEFAULT_BALANCE } from '../testUtils';


/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create inactiveRaffle input box
 *   - create ticketRepo input box
 * @returns vitest customized "it" object
*/
function createInactiveRaffleTest(winnersCount: number = 1, tokenGoalAsX: boolean = false) {
  const chain = new MockChain({ height: 1000 });
  const { creator, rosen } = testUtils.createPartners(chain, {
    Creator: CREATOR_DEFAULT_BALANCE,
    Rosen: ROSEN_DEFAULT_BALANCE,
  });
  // Created input service-box
  const serviceInputBox = testUtils.createServiceBoxMock();
  testUtils.createServiceOutputBox(1_000_000_000n)
  const winnersPercents = [];
  for(let i=0; i <= winnersCount; i++)
    winnersPercents.push(1000n / BigInt(winnersCount))
  serviceInputBox.setContextExtension({ 0: SColl(SLong, winnersPercents) });

  creator.addBalance({ tokens: [
    { tokenId: X_TOKEN_ID, amount: 100n },
    { tokenId: serviceInputBox.boxId, amount: 1_000_000_000n }
  ] });

  const ticketRepoInputBox = testUtils.createTicketRepoBoxMock();
  const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
    rosen.address.toString(),
    creator.address.toString(),
    serviceInputBox.boxId,
    BigInt(winnersCount),
    tokenGoalAsX ? { tokenId: X_TOKEN_ID, amount: 1n } : undefined
  );

  const activeRaffleInputBox = testUtils.createActiveRaffleBoxMock(
    creator.address.toString(),
    BigInt(winnersCount)
  );
  const raffleDetailsInputBox = testUtils.createRaffleDetailsBoxMock(serviceInputBox.boxId);
  const giftTokenRepoInputBox = testUtils.createGiftTokenRepoBoxMock(
    winnersCount,
    serviceInputBox.boxId.toString()
  );

  return it.extend({
    chain: chain,
    rosen: rosen,
    creator: creator,
    serviceInputBox: serviceInputBox,
    ticketRepoInputBox: ticketRepoInputBox,
    inactiveRaffleInputBox: inactiveRaffleInputBox,
    activeRaffleInputBox: activeRaffleInputBox,
    raffleDetailsInputBox: raffleDetailsInputBox,
    giftTokenRepoInputBox: giftTokenRepoInputBox
  });
}


describe('inactiveRaffle', () => {
  const inactiveRaffleBy1WinnerTest = createInactiveRaffleTest();
  const inactiveRaffleBy5WinnersTest = createInactiveRaffleTest(5);
  const inactiveRaffleBy1WinnerTestAndXToken = createInactiveRaffleTest(1, true);

  describe('Create active raffle successful', () => {
    inactiveRaffleBy1WinnerTest("Create active raffle by 1 winner", ({
      chain, rosen, creator, serviceInputBox, ticketRepoInputBox,
      inactiveRaffleInputBox, activeRaffleInputBox,
      raffleDetailsInputBox, giftTokenRepoInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        rosen.address.toString(),
        1n,
        inactiveRaffleInputBox,
        serviceInputBox.boxId.toString()
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox(serviceInputBox.boxId);
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        1,
        serviceInputBox.boxId.toString()
      );
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
          activeRaffleInputBox,
          raffleDetailsInputBox,
          giftTokenRepoInputBox,
          ...creator.utxos.toArray()
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            serviceInputBox.boxId.toString(),
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      const res = chain.execute(transaction, { signers: [creator] });
      // Check execution result
      expect(res).true;
    });

    inactiveRaffleBy5WinnersTest("Create active raffle by 5 winner", ({
        chain, rosen, creator, serviceInputBox, ticketRepoInputBox,
        inactiveRaffleInputBox, activeRaffleInputBox,
        raffleDetailsInputBox, giftTokenRepoInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        rosen.address.toString(),
        5n,
        inactiveRaffleInputBox,
        serviceInputBox.boxId.toString()
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox(serviceInputBox.boxId);
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        5,
        serviceInputBox.boxId.toString()
      );
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
          activeRaffleInputBox,
          raffleDetailsInputBox,
          giftTokenRepoInputBox,
          ...creator.utxos.toArray()
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            5n,
            serviceInputBox.boxId.toString(),
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      const res = chain.execute(transaction, { signers: [creator] });
      // Check execution result
      expect(res).true;
    });

    inactiveRaffleBy1WinnerTestAndXToken("Create active raffle by 1 winner and X token-goal", ({
      chain, rosen, creator, serviceInputBox, ticketRepoInputBox,
      inactiveRaffleInputBox, activeRaffleInputBox,
      raffleDetailsInputBox, giftTokenRepoInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        rosen.address.toString(),
        1n,
        inactiveRaffleInputBox,
        serviceInputBox.boxId.toString(),
        10n,
        { tokenId: X_TOKEN_ID, amount: 1n }
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox(serviceInputBox.boxId);
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        1,
        serviceInputBox.boxId.toString()
      );
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
          activeRaffleInputBox,
          raffleDetailsInputBox,
          giftTokenRepoInputBox,
          ...creator.utxos.toArray()
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            serviceInputBox.boxId.toString(),
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      const res = chain.execute(transaction, { signers: [creator] });
      // Check execution result
      expect(res).true;
    });
  });

  describe('Fail creating active raffle', () => {
    inactiveRaffleBy1WinnerTest("Fail create token by missed license-token", ({
      chain, rosen, creator, serviceInputBox, ticketRepoInputBox,
      inactiveRaffleInputBox, activeRaffleInputBox,
      raffleDetailsInputBox, giftTokenRepoInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        rosen.address.toString(),
        1n,
        inactiveRaffleInputBox,
        serviceInputBox.boxId.toString()
      );
      activeRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
      ticketRepoInputBox.assets.push({
        tokenId: testUtils.LICENSE_TOKEN_ID,
        amount: 1n
      });
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox(serviceInputBox.boxId);
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        1,
        serviceInputBox.boxId.toString()
      );
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
          activeRaffleInputBox,
          raffleDetailsInputBox,
          giftTokenRepoInputBox,
          ...creator.utxos.toArray()
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            serviceInputBox.boxId.toString(),
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() =>
        chain.execute(transaction, { signers: [creator] }),
      ).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Create active raffle by 1 winner", ({
      chain, rosen, creator, serviceInputBox, ticketRepoInputBox,
      inactiveRaffleInputBox, activeRaffleInputBox,
      raffleDetailsInputBox, giftTokenRepoInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        rosen.address.toString(),
        1n,
        inactiveRaffleInputBox,
        serviceInputBox.boxId.toString()
      );
      activeRaffleOutputBox.assets.at(1).amount = activeRaffleOutputBox.assets.at(1).amount - 1n
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox(serviceInputBox.boxId);
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        1,
        serviceInputBox.boxId.toString()
      );
      const winnerBoxes = testUtils.createWinnersOutputBox(
        1n,
        serviceInputBox.boxId.toString(),
        inactiveRaffleInputBox.boxId.toString()
      );
      if(activeRaffleOutputBox.assets.length >= 1) {
        winnerBoxes[0].addTokens({
          tokenId: activeRaffleOutputBox.assets.at(1).tokenId || '',
          amount: 1n
        });
      }
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
          activeRaffleInputBox,
          raffleDetailsInputBox,
          giftTokenRepoInputBox,
          ...creator.utxos.toArray()
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnerBoxes
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      // expect(
      chain.execute(transaction, { signers: [creator] })
      // ).toThrowError();
    });
  });
});
