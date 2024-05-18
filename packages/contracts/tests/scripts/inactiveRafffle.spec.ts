import { it, describe, expect } from 'vitest';
import { MockChain } from '@fleet-sdk/mock-chain';
import { SColl, SInt, SLong, SByte } from '@fleet-sdk/serializer';
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
  creator.addBalance({ tokens: [{ tokenId: X_TOKEN_ID, amount: 100n }] });
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

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong ticket token", ({
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
      const winnerBoxes = testUtils.createWinnersOutputBox(
        1n,
        serviceInputBox.boxId.toString(),
        inactiveRaffleInputBox.boxId.toString()
      );
      if(ticketRepoInputBox.assets.length >= 1) {
        ticketRepoInputBox.assets[0].amount = ticketRepoInputBox.assets[0].amount - 1n;
        winnerBoxes[0].addTokens({
          tokenId: ticketRepoInputBox.assets[0].tokenId || '',
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
      expect(
        () => chain.execute(transaction, { signers: [creator] })
      ).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create by wrong R4 of active raffle", ({
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
      activeRaffleOutputBox.setAdditionalRegisters({
        R4: SColl(SLong, [5n, 6n]).toHex()
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
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create by wrong R5 of active raffle", ({
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
      activeRaffleOutputBox.setAdditionalRegisters({
        R4: SColl(SLong, [
          60n, // CharityPercentage,
          10n, // ServiceFeePercent,
          10n, // ImplementerFeePercent,
          10n, // TicketPrice,
          1000n, // Goal,
          0n, // DeadlineTimestamp,
          1n, // WinnersCount,
          testUtils.FEE, // TxFee
        ]).toHex(),
        R5: SColl(SLong, [5n, 6n]).toHex()
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
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create by wrong value of active raffle", ({
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
      activeRaffleOutputBox.setValue(150_000n);
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
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong collection token on the inactive-box", ({
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

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTestAndXToken("Fail create active raffle by wrong collection token on the active-box", ({
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
        // { tokenId: X_TOKEN_ID, amount: 1n }
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

        // Check execution result
        expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong winner box percentage", ({
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
      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        serviceInputBox.boxId.toString(),
        inactiveRaffleInputBox.boxId.toString()
      );
      winnersBoxes[0].setAdditionalRegisters({
        R4: SColl(SLong, [BigInt(1), 2000n, 0n, testUtils.FEE]),
      });
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
          ...winnersBoxes
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong winner box index", ({
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
      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        serviceInputBox.boxId.toString(),
        inactiveRaffleInputBox.boxId.toString()
      );
      winnersBoxes[0].setAdditionalRegisters({
        R4: SColl(SLong, [BigInt(44), 1000n, 0n, testUtils.FEE]),
      });
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
          ...winnersBoxes
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong winner box ticket-token", ({
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
      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        serviceInputBox.boxId.toString(),
        inactiveRaffleInputBox.boxId.toString()
      );

      // Replace wrong data 
      winnersBoxes[0].assets.remove(serviceInputBox.boxId.toString());
      winnersBoxes[0].assets.add({
        tokenId: X_TOKEN_ID,
        amount: 1n
      });

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
          ...winnersBoxes
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong raffle-details box without ticket token", ({
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
      // Remove ticket token from raffle-details box
      raffleDetailsOutputBox.assets.remove(0);

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
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong raffle-details box R4 value", ({
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
      // Replace invalid R4 value from raffle-details box
      raffleDetailsOutputBox.setAdditionalRegisters({
        R4: SColl(SColl(SByte), [
          Array.from(Buffer.from('Invalid Name')),
          Array.from(Buffer.from('Some invalid descriptions...')),
        ]).toHex()
      });

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
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by missed some tokens on the gift-token box", ({
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
        serviceInputBox.boxId.toString(),
        // preventing of minting token of gift-token box
        false
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
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    inactiveRaffleBy1WinnerTest("Fail create active raffle by wrong R7 value of gift-token box", ({
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
      // Place wrong R7 value to the gift-token box
      giftTokenRepoOutputBox.setAdditionalRegisters({
        R4: SColl(SInt, [1]).toHex(),
        R5: SColl(SInt, [2]).toHex(),
        R6: SColl(SInt, [3]).toHex(),
        R7: SColl(SInt, [1, 1, Number(testUtils.FEE)]).toHex(),
        R8: SColl(SByte, Array.from(Buffer.from('abcd', 'hex'))),
      });

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
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });
  });
});
