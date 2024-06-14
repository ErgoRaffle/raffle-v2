import { it, describe, expect } from 'vitest';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { SColl, SInt, SLong, SByte } from '@fleet-sdk/serializer';
import { TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

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
function createInactiveRaffleTest(winnersCount: number = 1) {
  const chain = new MockChain({ height: 1000 });
  const { creator, rosen } = testUtils.createPartners(chain, {
    Creator: CREATOR_DEFAULT_BALANCE,
    Rosen: ROSEN_DEFAULT_BALANCE,
  });

  const ticketRepoInputBox = testUtils.createTicketRepoBoxMock();
  const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
    creator.address.toString(),
    rosen.address.toString(),
    creator.address.toString(),
    BigInt(winnersCount)
  );

  return it.extend({
    chain: chain,
    rosen: rosen,
    creator: creator,
    ticketRepoInputBox: ticketRepoInputBox,
    inactiveRaffleInputBox: inactiveRaffleInputBox,
    contractsAddresses: testUtils.contractsAddresses
  });
}


describe('inactiveRaffle', () => {
  const inactiveRaffleBy1WinnerTest = createInactiveRaffleTest();
  const inactiveRaffleBy5WinnersTest = createInactiveRaffleTest(5);

  describe('Create active raffle', () => {
    /**
     * @target inactive-raffle should  create active raffle by 1 winner successfully
     * @scenario
     * - create three output boxes by valid values and one winner box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should create active raffle by 1 winner successfully", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);

      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        inactiveRaffleInputBox.boxId.toString()
      );

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
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

      const res = chain.execute(transaction, { signers: [creator] });
      // Check execution result
      expect(res).true;
    });

    /**
     * @target inactive-raffle should  create active raffle by 5 winner
     * @scenario
     * - create three output boxes by valid values and 5 winners boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy5WinnersTest("Should create active raffle by 5 winner", ({
        chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        5n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 5);
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            5n,
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

    /**
     * @target inactive-raffle should  create active raffle by 1 winner and X token-goal
     * @scenario
     * - create three output boxes by valid values and one winner box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should create active raffle by 1 winner and X token-goal", ({
      chain, rosen, creator, ticketRepoInputBox
    }) => {
      const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
        creator.address.toString(),
        rosen.address.toString(),
        creator.address.toString(),
        1n,
        { tokenId: X_TOKEN_ID, amount: 1n }
      );
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n,
        10n,
        { tokenId: X_TOKEN_ID, amount: 1n }
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        inactiveRaffleInputBox.boxId.toString()
      );

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersBoxes
        ])
        .payFee(testUtils.FEE)
        // .sendChangeTo(creator.address)
        .build();

      const res = chain.execute(transaction, { signers: [creator] });
      // Check execution result
      expect(res).true;
    });
  });

    /**
     * @target inactive-raffle Should creating of active raffle be fail when license-token missed
     * @scenario
     * - create three output boxes by valid values and one winner box(remove license-token from active box and added to gift box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should creating of active raffle be fail when license-token missed", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );

      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      
      // remove license token
      activeRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
      giftTokenRepoOutputBox.assets.add({
        tokenId: testUtils.LICENSE_TOKEN_ID,
        amount: 1n
      });

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
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

    /**
     * @target inactive-raffle should fail to create active raffle by wrong ticket token
     * @scenario
     * - create three output boxes by valid values and one winner box(move one ticket token from active box to gift box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong ticket token", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );

      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      const winnerBoxes = testUtils.createWinnersOutputBox(
        1n,
        inactiveRaffleInputBox.boxId.toString()
      );

      // Move one ticket token from Active-Raffle box to the Gift-Token-Repo Box
      activeRaffleOutputBox.assets.at(1).amount = activeRaffleOutputBox.assets.at(1).amount - 1n;
      giftTokenRepoOutputBox.addTokens({
        tokenId: activeRaffleOutputBox.assets.at(1).tokenId as string,
        amount: 1n
      });

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
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

    /**
     * @target inactive-raffle should fail to create active raffle by wrong R4 of active raffle
     * @scenario
     * - create three output boxes by valid values and one winner box(set invalid value on the R4 of active box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create by wrong R4 of active raffle", ({
      chain, rosen, creator, ticketRepoInputBox,
      inactiveRaffleInputBox, contractsAddresses
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);

      // Set invalid value as R4 data
      activeRaffleOutputBox.setAdditionalRegisters({
        R4: SColl(SLong, [5n, 6n]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(Buffer.from((contractsAddresses as {[k: string]: string})['service'], 'hex')),
          Array.from(Buffer.from(rosen.address.toString())),
          Array.from(Buffer.from(creator.address.toString())),
        ]),
        R6: SColl(SLong, [0n]).toHex(),
      });

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong R5 of active raffle
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong R5 value on the active raffle box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create by wrong R5 of active raffle", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);

      // replace invalid R5 value of the Active-Raffle box
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
        R5: SColl(SLong, [5n, 6n]).toHex(),
        R6: SColl(SLong, [0n]).toHex()
      });

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong value of active raffle
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong value of active raffle box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create by wrong value of active raffle", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      
      // Set invalid value for the active-raffle box
      activeRaffleOutputBox.setValue(150_000n);
      
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong collection token on the active-box
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong collection token on the active-box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong collection token on the inactive-box", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      // Set collecting token as X-Token that not found on the Inactive-Raffle Box
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n,
        10n,
        { tokenId: X_TOKEN_ID, amount: 1n } // set collection token
      );
      const extraInputBox = mockUTxO({
        ergoTree: creator.ergoTree,
        value: 11_000_000n,
        creationHeight: 4,
        assets: [
          { tokenId: X_TOKEN_ID, amount: 1n }
        ]
      });
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
          extraInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle Should fail create active raffle by wrong collection token on the active-box
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong collection token on the inactive-box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong collection token on the active-box", ({
      chain, rosen, creator, ticketRepoInputBox
    }) => {
      const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
        testUtils.contractsAddresses['service'],
        rosen.address.toString(),
        creator.address.toString(),
        1n,
        { tokenId: X_TOKEN_ID, amount: 1n }  // Set collection token as X-Token that missed on the active box
      );

      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      // added X-Token to the gift box to prevent burn token error raising
      giftTokenRepoOutputBox.addTokens({ tokenId: X_TOKEN_ID, amount: 1n });

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

        // Check execution result
        expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong winner box percentage
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong winner box percentage)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong winner box percentage", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        inactiveRaffleInputBox.boxId.toString()
      );

      // Set winner box wrong percentage on the R4 second cell
      winnersBoxes[0].setAdditionalRegisters({
        R4: SColl(SLong, [BigInt(1), 2000n, 0n, testUtils.FEE]),
      });
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
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

    /**
     * @target inactive-raffle should fail to create active raffle by wrong winner box index
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong winner box index)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong winner box index", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        inactiveRaffleInputBox.boxId.toString()
      );

      // Set winner box wrong index on the R4 first cell
      winnersBoxes[0].setAdditionalRegisters({
        R4: SColl(SLong, [BigInt(43), 1000n, 0n, testUtils.FEE]),
      });
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
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

    /**
     * @target inactive-raffle should fail to create active raffle by wrong winner box ticket-token
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong winner box ticket-token)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("should fail create active raffle by winner box without ticket token", ({
      chain, rosen, creator, ticketRepoInputBox
    }) => {
      const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
        testUtils.contractsAddresses['service'],
        rosen.address.toString(),
        creator.address.toString(),
        1n,
        { tokenId: X_TOKEN_ID, amount: 1n }
      );
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      const winnersBoxes = testUtils.createWinnersOutputBox(
        1n,
        inactiveRaffleInputBox.boxId.toString()
      );

      // Replace wrong ticket-token data
      winnersBoxes[0].assets.remove(testUtils.TICKET_TOKEN_ID);
      winnersBoxes[0].assets.add({
        tokenId: testUtils.X_TOKEN_ID,
        amount: 1n
      });
      activeRaffleOutputBox.assets.remove(testUtils.TICKET_TOKEN_ID);
      activeRaffleOutputBox.addTokens({
        tokenId: testUtils.TICKET_TOKEN_ID,
        amount: 1_000_000_000n - 1n - 1n + 1n  // at last + 1n added to prevent burn token error
      });

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
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

    /**
     * @target inactive-raffle should fail to create active raffle
     * by wrong raffle-details box without ticket token
     * @scenario
     * - create three output boxes by valid values and one winner box(remove ticket token from raffle-details box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong raffle-details box without ticket token", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();

      // Remove ticket token from raffle-details box
      raffleDetailsOutputBox.assets.remove(0);
      activeRaffleOutputBox.assets.remove(testUtils.TICKET_TOKEN_ID);
      activeRaffleOutputBox.addTokens({
        tokenId: testUtils.TICKET_TOKEN_ID,
        amount: 1_000_000_000n - 1n - 1n + 1n  // at last + 1n added to prevent burn token error
      });

      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);
      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong raffle-details box R4 value
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong raffle-details box R4 value)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong raffle-details box R4 value", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);

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
          ticketRepoInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by missed some tokens on the gift-token box
     * @scenario
     * - create three output boxes by valid values and one winner box(set missed some tokens on the gift-token box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by missed some tokens on the gift-token box", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        1,
        inactiveRaffleInputBox.boxId.toString(),
        // preventing of minting token of gift-token box
        false
      );

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong R7 value of gift-token box
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong R7 value of gift-token box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("Should fail create active raffle by wrong R7 value of gift-token box", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(1, 1);

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
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          )
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong giftToken placement
     * @scenario
     * - create three output boxes by valid values and one winner box(locate giftToken to activeRaffle Box)
     * - execute transaction
     * - check execution done fail
     * @expected
     * - transaction result must be true
     */
    inactiveRaffleBy1WinnerTest("should fail to create active raffle by wrong giftToken placement", ({
      chain, rosen, creator, ticketRepoInputBox, inactiveRaffleInputBox
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        rosen.address.toString(),
        1n
      );
      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        1,
        testUtils.TICKET_TOKEN_ID,
        true,
        1n
      );

      // Create input and output box required for this test
      const extraInput = mockUTxO({
        ergoTree: creator.ergoTree,
        value: 150_000n,
        creationHeight: 10
      });
      const changeBox = new OutputBuilder(
        150_000n,
        creator.address.toString()
      )
      .addTokens(
          {
            tokenId: inactiveRaffleInputBox.boxId,
            amount: 1n
          }
      );

      const transaction = new TransactionBuilder(chain.height)
        .from([
          inactiveRaffleInputBox,
          ticketRepoInputBox,
          // Add extra nano-erg as input
          extraInput
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...testUtils.createWinnersOutputBox(
            1n,
            inactiveRaffleInputBox.boxId.toString()
          ),
          changeBox
        ])
        .payFee(testUtils.FEE)
        .build();

      // Check execution result
      expect(() => chain.execute(transaction, { signers: [creator] })).toThrowError();
    });
  });
