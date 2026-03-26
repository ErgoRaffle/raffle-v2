import { ErgoUnsignedInput, TransactionBuilder } from '@fleet-sdk/core';
import { KeyedMockChainParty, mockUTxO } from '@fleet-sdk/mock-chain';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

interface TicketRepoTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  project: KeyedMockChainParty;
  someoneWallet: KeyedMockChainParty;
  ticketRepoInputBox: ErgoUnsignedInput;
  inactiveRaffleInputBox: ErgoUnsignedInput;
}

interface TestInterface {
  ticketRepoBy1WinnerTestRequirements: TicketRepoTestInterface;
  ticketRepoBy5WinnerTestRequirements: TicketRepoTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create ticketRepo & inactiveRaffle input boxes
 * @returns object
 */
const provideTicketRepoTestRequirements = (winnersCount: number = 1) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'ticketRepo',
    ) as ScriptNamesType[],
  );
  const { project, someone } = boxFactory.createPartners({
    project: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
    Someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });

  const ticketRepoInputBox = boxFactory.createTicketRepoBoxMock();
  const inactiveRaffleInputBox = boxFactory.createInactiveRaffleBoxMock(
    project.ergoTree,
    someone.ergoTree,
    project.ergoTree,
    winnersCount,
    undefined,
    undefined,
    10n,
    undefined,
    testUtils.TestConstants.CREATION_FEE,
    undefined,
    0n,
  );

  return {
    boxFactory: boxFactory,
    someoneWallet: someone,
    project: project,
    ticketRepoInputBox: ticketRepoInputBox,
    inactiveRaffleInputBox: inactiveRaffleInputBox,
  };
};

describe('ticketRepo', () => {
  beforeEach<TestInterface>(async (ctx) => {
    ctx.ticketRepoBy1WinnerTestRequirements =
      provideTicketRepoTestRequirements();
    ctx.ticketRepoBy5WinnerTestRequirements =
      provideTicketRepoTestRequirements(5);
  });

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
    it<TestInterface>('should create active raffle by 1 winner successfully', ({
      ticketRepoBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.someoneWallet.ergoTree,
        );
      const raffleDetailsOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      const winnersBoxes =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );

      const transaction = new TransactionBuilder(
        ticketRepoBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox,
          ticketRepoBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(ticketRepoBy1WinnerTestRequirements.project.address)
        .build();

      const res = ticketRepoBy1WinnerTestRequirements.boxFactory.chain.execute(
        transaction,
        {
          signers: [ticketRepoBy1WinnerTestRequirements.project],
        },
      );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target should create active raffle by 5 winner
     * @scenario
     * - create three output boxes by valid values and 5 winners boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should create active raffle by 5 winner', ({
      ticketRepoBy5WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        ticketRepoBy5WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          ticketRepoBy5WinnerTestRequirements.project.ergoTree,
          ticketRepoBy5WinnerTestRequirements.project.ergoTree,
          ticketRepoBy5WinnerTestRequirements.someoneWallet.ergoTree,
          5,
        );
      const raffleDetailsOutputBox =
        ticketRepoBy5WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        ticketRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
        );
      const transaction = new TransactionBuilder(
        ticketRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          ticketRepoBy5WinnerTestRequirements.inactiveRaffleInputBox,
          ticketRepoBy5WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...ticketRepoBy5WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            5,
            ticketRepoBy5WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(ticketRepoBy5WinnerTestRequirements.project.address)
        .build();

      const res = ticketRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
        transaction,
        {
          signers: [ticketRepoBy5WinnerTestRequirements.project],
        },
      );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target should creating of active raffle by 1 winner with invalid ticket token id be fail
     * @scenario
     * - create three output boxes(by invalid ticket-token in active box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should creating of active raffle by 1 winner with invalid ticket token id be fail', ({
      ticketRepoBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.someoneWallet.ergoTree,
        );
      const raffleDetailsOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const winnersOutputBoxes =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );
      const giftTokenRepoOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Replace Ticket-Token with another token
      const extraInputBox = mockUTxO({
        value: testUtils.TestConstants.FEE,
        ergoTree: ticketRepoBy1WinnerTestRequirements.project.ergoTree,
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
        .from([
          ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox,
          ticketRepoBy1WinnerTestRequirements.ticketRepoInputBox,
          extraInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersOutputBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(ticketRepoBy1WinnerTestRequirements.project.address)
        .build();

      expect(() =>
        ticketRepoBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [ticketRepoBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target should creating of active raffle by 1 winner with invalid number of ticket token be fail
     * @scenario
     * - create three output boxes(by invalid number of ticket token in active box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should creating of active raffle by 1 winner with invalid number of ticket token be fail', ({
      ticketRepoBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.someoneWallet.ergoTree,
          1,
          undefined,
          undefined,
          // Decreasing Ticket-Token number sets in activeRaffleOutputBox
          1_000_000_000n,
          undefined,
          999_999_997n,
        );
      const raffleDetailsOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const winnersOutputBoxes =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );
      const giftTokenRepoOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Move one extra Ticket-Token to the giftTokenRepoOutputBox
      giftTokenRepoOutputBox.assets.add({
        tokenId: testUtils.TestConstants.TICKET_TOKEN_ID,
        amount: 1n,
      });

      const transaction = new TransactionBuilder(1000)
        .from([
          ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox,
          ticketRepoBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersOutputBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        ticketRepoBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [ticketRepoBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target should creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box be fail
     * @scenario
     * - create three output boxes(by invalid ticket-token id in inactive input box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box be fail', ({
      ticketRepoBy1WinnerTestRequirements,
    }) => {
      // Replace Ticket-Token id with invalid id
      const inactiveRaffleInputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createInactiveRaffleBoxMock(
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.someoneWallet.ergoTree,
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
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
        value: testUtils.TestConstants.FEE,
        ergoTree: ticketRepoBy1WinnerTestRequirements.project.ergoTree,
        assets: [
          {
            tokenId: '1234'.repeat(16),
            amount: 1_000_000_000n,
          },
        ],
      });

      const activeRaffleOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.project.ergoTree,
          ticketRepoBy1WinnerTestRequirements.someoneWallet.ergoTree,
        );
      const raffleDetailsOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const winnersOutputBoxes =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );
      const giftTokenRepoOutputBox =
        ticketRepoBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      const transaction = new TransactionBuilder(1000)
        .from([
          inactiveRaffleInputBox,
          ticketRepoBy1WinnerTestRequirements.ticketRepoInputBox,
          extraInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersOutputBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(ticketRepoBy1WinnerTestRequirements.project.address)
        .build();

      expect(() =>
        ticketRepoBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [ticketRepoBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });
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
  it<TestInterface>('should fail creating active raffle by wrong place of ticket token', ({
    ticketRepoBy1WinnerTestRequirements,
  }) => {
    const activeRaffleOutputBox =
      ticketRepoBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
        ticketRepoBy1WinnerTestRequirements.project.ergoTree,
        ticketRepoBy1WinnerTestRequirements.project.ergoTree,
        ticketRepoBy1WinnerTestRequirements.someoneWallet.ergoTree,
      );

    const raffleDetailsOutputBox =
      ticketRepoBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
    const giftTokenRepoOutputBox =
      ticketRepoBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
        1,
      );
    const winnerBoxes =
      ticketRepoBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
        1,
        ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
      );

    // Decrease one ticket token from Active-Raffle box
    activeRaffleOutputBox.assets.at(1).amount =
      activeRaffleOutputBox.assets.at(1).amount - 1n;

    const transaction = new TransactionBuilder(
      ticketRepoBy1WinnerTestRequirements.boxFactory.chain.height,
    )
      .from([
        ticketRepoBy1WinnerTestRequirements.inactiveRaffleInputBox,
        ticketRepoBy1WinnerTestRequirements.ticketRepoInputBox,
      ])
      .to([
        activeRaffleOutputBox,
        raffleDetailsOutputBox,
        giftTokenRepoOutputBox,
        ...winnerBoxes,
      ])
      .payFee(testUtils.TestConstants.FEE)
      .sendChangeTo(ticketRepoBy1WinnerTestRequirements.project.address)
      .burnTokens({
        tokenId: activeRaffleOutputBox.assets.at(1).tokenId!.toString(),
        amount: 1n,
      })
      .build();

    // Check execution result
    expect(() =>
      ticketRepoBy1WinnerTestRequirements.boxFactory.chain.execute(
        transaction,
        { signers: [ticketRepoBy1WinnerTestRequirements.project] },
      ),
    ).toThrowError();
  });
});
