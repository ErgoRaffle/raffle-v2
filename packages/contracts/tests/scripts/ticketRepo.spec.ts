import { it, describe, expect } from 'vitest';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { TransactionBuilder } from '@fleet-sdk/core';
import { compile } from '@fleet-sdk/compiler';

import * as testUtils from '../testUtils';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create inactiveRaffle input box(by sigmaProp(true) ergoTree)
 *   - create ticketRepo input box
 * @returns vitest customized "it" object
 */
function createInactiveRaffleTest(winnersCount: number = 1) {
  const chain = new MockChain({ height: 1000 });
  const { creator, someone } = testUtils.createPartners(chain, {
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
    Someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });

  const ticketRepoInputBox = testUtils.createTicketRepoBoxMock();
  const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
    creator.address.toString(),
    someone.address.toString(),
    creator.address.toString(),
    BigInt(winnersCount),
    undefined,
    undefined,
    10n,
    undefined,
    1_000_000_000n,
    undefined,
    0n,
    compile('{sigmaProp(true);}').toHex().toString(),
  );

  return it.extend({
    chain: chain,
    someoneWallet: someone,
    creator: creator,
    ticketRepoInputBox: ticketRepoInputBox,
    inactiveRaffleInputBox: inactiveRaffleInputBox,
    contractsAddresses: testUtils.contractsAddresses,
  });
}

describe('ticketRepo', () => {
  const ticketRepoBy1WinnerTest = createInactiveRaffleTest();
  const ticketRepoBy5WinnerTest = createInactiveRaffleTest(5);

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
        chain,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
          creator.address.toString(),
          creator.address.toString(),
          someoneWallet.address.toString(),
          1n,
        );
        const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
        const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
          1,
          1,
        );

        const winnersBoxes = testUtils.createWinnersOutputBox(
          1n,
          inactiveRaffleInputBox.boxId.toString(),
        );

        const transaction = new TransactionBuilder(chain.height)
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

        const res = chain.execute(transaction, { signers: [creator] });
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
        chain,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
          creator.address.toString(),
          creator.address.toString(),
          someoneWallet.address.toString(),
          5n,
        );
        const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
        const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
          1,
          5,
        );
        const transaction = new TransactionBuilder(chain.height)
          .from([inactiveRaffleInputBox, ticketRepoInputBox])
          .to([
            activeRaffleOutputBox,
            raffleDetailsOutputBox,
            giftTokenRepoOutputBox,
            ...testUtils.createWinnersOutputBox(
              5n,
              inactiveRaffleInputBox.boxId.toString(),
            ),
          ])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [creator] });
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
        chain,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
          creator.address.toString(),
          creator.address.toString(),
          someoneWallet.address.toString(),
          1n,
        );
        const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
        const winnersOutputBoxes = testUtils.createWinnersOutputBox(
          1n,
          inactiveRaffleInputBox.boxId.toString(),
        );
        const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
          1,
          1,
        );

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
          chain.execute(transaction, { signers: [creator] }),
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
        chain,
        someoneWallet,
        creator,
        ticketRepoInputBox,
        inactiveRaffleInputBox,
      }) => {
        const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
          creator.address.toString(),
          creator.address.toString(),
          someoneWallet.address.toString(),
          1n,
          undefined,
          undefined,
          // Decreasing Ticket-Token number sets in activeRaffleOutputBox
          1_000_000_000n,
          undefined,
          999_999_997n,
        );
        const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
        const winnersOutputBoxes = testUtils.createWinnersOutputBox(
          1n,
          inactiveRaffleInputBox.boxId.toString(),
        );
        const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
          1,
          1,
        );

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
          chain.execute(transaction, { signers: [creator] }),
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
      ({ chain, someoneWallet, creator, ticketRepoInputBox }) => {
        // Replace Ticket-Token id with invalid id
        const inactiveRaffleInputBox = testUtils.createInactiveRaffleBoxMock(
          creator.address.toString(),
          someoneWallet.address.toString(),
          creator.address.toString(),
          1n,
          undefined,
          undefined,
          10n,
          undefined,
          1_000_000_000n,
          '1234'.repeat(16),
          0n,
          compile('{sigmaProp(true);}').toHex().toString(),
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

        const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
          creator.address.toString(),
          creator.address.toString(),
          someoneWallet.address.toString(),
          1n,
        );
        const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
        const winnersOutputBoxes = testUtils.createWinnersOutputBox(
          1n,
          inactiveRaffleInputBox.boxId.toString(),
        );
        const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
          1,
          1,
        );

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
          chain.execute(transaction, { signers: [creator] }),
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
      chain,
      someoneWallet,
      creator,
      ticketRepoInputBox,
      inactiveRaffleInputBox,
    }) => {
      const activeRaffleOutputBox = testUtils.createActiveRaffleOutputBox(
        creator.address.toString(),
        creator.address.toString(),
        someoneWallet.address.toString(),
        1n,
      );

      const raffleDetailsOutputBox = testUtils.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox = testUtils.createGiftTokenRepoOutputBox(
        1,
        1,
      );
      const winnerBoxes = testUtils.createWinnersOutputBox(
        1n,
        inactiveRaffleInputBox.boxId.toString(),
      );

      // Decrease one ticket token from Active-Raffle box
      activeRaffleOutputBox.assets.at(1).amount =
        activeRaffleOutputBox.assets.at(1).amount - 1n;

      const transaction = new TransactionBuilder(chain.height)
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
        chain.execute(transaction, { signers: [creator] }),
      ).toThrowError();
    },
  );
});
