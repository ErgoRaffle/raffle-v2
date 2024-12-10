import { it, describe, expect } from 'vitest';
import { mockUTxO } from '@fleet-sdk/mock-chain';
import { TransactionBuilder } from '@fleet-sdk/core';

import * as constants from '../../constants';
import * as testUtils from '../testUtils';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create ticketRepo & inactiveRaffle input boxes
 * @returns vitest customized "it" object
 */
function createTicketRepoTest(winnersCount: number = 1) {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'ticketRepo',
    ) as ScriptNamesType[],
  );
  const { creator, someone } = boxFactory.createPartners({
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
    Someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });

  const ticketRepoInputBox = boxFactory.createTicketRepoBoxMock();
  const inactiveRaffleInputBox = boxFactory.createInactiveRaffleBoxMock(
    creator.ergoTree,
    someone.ergoTree,
    creator.ergoTree,
    winnersCount,
    undefined,
    undefined,
    10n,
    undefined,
    testUtils.CREATION_FEE,
    undefined,
    0n,
  );

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    ticketRepoInputBox: ticketRepoInputBox,
    inactiveRaffleInputBox: inactiveRaffleInputBox,
  });
}

describe('ticketRepo', () => {
  const ticketRepoBy1WinnerTest = createTicketRepoTest();
  const ticketRepoBy5WinnerTest = createTicketRepoTest(5);

  describe('Active raffle creation', () => {
    /**
     * @target should create active raffle by 1 winner successfully
     * @scenario
     * - create three output boxes by valid values and one winner box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    ticketRepoBy1WinnerTest(
      'should create active raffle by 1 winner successfully',
      ({
        boxFactory,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creator.ergoTree,
          creator.ergoTree,
          someoneWallet.ergoTree,
        );
        const raffleDetailsOutputBox =
          boxFactory.createRaffleDetailsOutputBox();
        const giftTokenRepoOutputBox =
          boxFactory.createGiftTokenRepoOutputBox(1);

        const winnersBoxes = boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([inactiveRaffleInputBox, ticketRepoInputBox])
          .to([
            activeRaffleOutputBox,
            raffleDetailsOutputBox,
            giftTokenRepoOutputBox,
            ...winnersBoxes,
          ])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = boxFactory.chain.execute(transaction, {
          signers: [creator],
        });
        // Check execution result
        expect(res).true;
      },
    );

    /**
     * @target should create active raffle by 5 winner
     * @scenario
     * - create three output boxes by valid values and 5 winners boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    ticketRepoBy5WinnerTest(
      'should create active raffle by 5 winner',
      ({
        boxFactory,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creator.ergoTree,
          creator.ergoTree,
          someoneWallet.ergoTree,
          5,
        );
        const raffleDetailsOutputBox =
          boxFactory.createRaffleDetailsOutputBox();
        const giftTokenRepoOutputBox =
          boxFactory.createGiftTokenRepoOutputBox(5);
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([inactiveRaffleInputBox, ticketRepoInputBox])
          .to([
            activeRaffleOutputBox,
            raffleDetailsOutputBox,
            giftTokenRepoOutputBox,
            ...boxFactory.createWinnersOutputBox(
              5,
              inactiveRaffleInputBox.boxId.toString(),
            ),
          ])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = boxFactory.chain.execute(transaction, {
          signers: [creator],
        });
        // Check execution result
        expect(res).true;
      },
    );

    /**
     * @target should creating of active raffle by 1 winner with invalid ticket token id be fail
     * @scenario
     * - create three output boxes(by invalid ticket-token in active box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    ticketRepoBy1WinnerTest(
      'should creating of active raffle by 1 winner with invalid ticket token id be fail',
      ({
        boxFactory,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creator.ergoTree,
          creator.ergoTree,
          someoneWallet.ergoTree,
        );
        const raffleDetailsOutputBox =
          boxFactory.createRaffleDetailsOutputBox();
        const winnersOutputBoxes = boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );
        const giftTokenRepoOutputBox =
          boxFactory.createGiftTokenRepoOutputBox(1);

        // Replace Ticket-Token with another token
        const extraInputBox = mockUTxO({
          value: testUtils.FEE,
          ergoTree: creator.ergoTree,
          assets: [
            {
              tokenId: '12'.repeat(32),
              amount: 1_000_000_000n,
            },
          ],
        });
        activeRaffleOutputBox.assets.remove(1);
        activeRaffleOutputBox.assets.add({
          tokenId: '12'.repeat(32),
          amount: 1_000_000_000n - 1n - 1n,
        });

        const transaction = new TransactionBuilder(1000)
          .from([inactiveRaffleInputBox, ticketRepoInputBox, extraInputBox])
          .to([
            activeRaffleOutputBox,
            raffleDetailsOutputBox,
            giftTokenRepoOutputBox,
            ...winnersOutputBoxes,
          ])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target should creating of active raffle by 1 winner with invalid number of ticket token be fail
     * @scenario
     * - create three output boxes(by invalid number of ticket token in active box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    ticketRepoBy1WinnerTest(
      'should creating of active raffle by 1 winner with invalid number of ticket token be fail',
      ({
        boxFactory,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creator.ergoTree,
          creator.ergoTree,
          someoneWallet.ergoTree,
          1,
          undefined,
          undefined,
          // Decreasing Ticket-Token number sets in activeRaffleOutputBox
          1_000_000_000n,
          undefined,
          999_999_997n,
        );
        const raffleDetailsOutputBox =
          boxFactory.createRaffleDetailsOutputBox();
        const winnersOutputBoxes = boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );
        const giftTokenRepoOutputBox =
          boxFactory.createGiftTokenRepoOutputBox(1);

        // Move one extra Ticket-Token to the giftTokenRepoOutputBox
        giftTokenRepoOutputBox.assets.add({
          tokenId: testUtils.TICKET_TOKEN_ID,
          amount: 1n,
        });

        const transaction = new TransactionBuilder(1000)
          .from([inactiveRaffleInputBox, ticketRepoInputBox])
          .to([
            activeRaffleOutputBox,
            raffleDetailsOutputBox,
            giftTokenRepoOutputBox,
            ...winnersOutputBoxes,
          ])
          .payFee(testUtils.FEE)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target should creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box be fail
     * @scenario
     * - create three output boxes(by invalid ticket-token id in inactive input box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    ticketRepoBy1WinnerTest(
      'should creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box be fail',
      ({ boxFactory, someoneWallet, creator, ticketRepoInputBox }) => {
        // Replace Ticket-Token id with invalid id
        const inactiveRaffleInputBox = boxFactory.createInactiveRaffleBoxMock(
          creator.ergoTree,
          someoneWallet.ergoTree,
          creator.ergoTree,
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          1_000_000_000n,
          '1234'.repeat(16),
          0n,
        );
        const extraInputBox = mockUTxO({
          value: testUtils.FEE,
          ergoTree: creator.ergoTree,
          assets: [
            {
              tokenId: '1234'.repeat(16),
              amount: 1_000_000_000n,
            },
          ],
        });

        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creator.ergoTree,
          creator.ergoTree,
          someoneWallet.ergoTree,
        );
        const raffleDetailsOutputBox =
          boxFactory.createRaffleDetailsOutputBox();
        const winnersOutputBoxes = boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );
        const giftTokenRepoOutputBox =
          boxFactory.createGiftTokenRepoOutputBox(1);

        const transaction = new TransactionBuilder(1000)
          .from([inactiveRaffleInputBox, ticketRepoInputBox, extraInputBox])
          .to([
            activeRaffleOutputBox,
            raffleDetailsOutputBox,
            giftTokenRepoOutputBox,
            ...winnersOutputBoxes,
          ])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );
  });

  /**
   * @target should fail creating active raffle by wrong place of ticket token
   * @scenario
   * - create three output boxes by valid values and one winner box(move one ticket token from active box to gift box)
   * - execute transaction
   * - check execution done fail
   * @expected
   * - transaction result must be true
   */
  ticketRepoBy1WinnerTest(
    'should fail creating active raffle by wrong place of ticket token',
    ({
      boxFactory,
      someoneWallet,
      creator,
      ticketRepoInputBox,
      inactiveRaffleInputBox,
    }) => {
      const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
        creator.ergoTree,
        creator.ergoTree,
        someoneWallet.ergoTree,
      );

      const raffleDetailsOutputBox = boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = boxFactory.createGiftTokenRepoOutputBox(1);
      const winnerBoxes = boxFactory.createWinnersOutputBox(
        1,
        inactiveRaffleInputBox.boxId.toString(),
      );

      // Decrease one ticket token from Active-Raffle box
      activeRaffleOutputBox.assets.at(1).amount =
        activeRaffleOutputBox.assets.at(1).amount - 1n;

      const transaction = new TransactionBuilder(boxFactory.chain.height)
        .from([inactiveRaffleInputBox, ticketRepoInputBox])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnerBoxes,
        ])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .burnTokens({
          tokenId: activeRaffleOutputBox.assets.at(1).tokenId!.toString(),
          amount: 1n,
        })
        .build();

      // Check execution result
      expect(() =>
        boxFactory.chain.execute(transaction, { signers: [creator] }),
      ).toThrowError();
    },
  );
});
