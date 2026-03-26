import {
  ErgoUnsignedInput,
  OutputBuilder,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SColl, SByte } from '@fleet-sdk/serializer';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

const ARBITRARY_TOKEN_ID = '10'.repeat(32);

interface ActiveRaffleTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  donatorWallet: KeyedMockChainParty;
  projectWallet: KeyedMockChainParty;
  implementerWallet: KeyedMockChainParty;
  someoneWallet: KeyedMockChainParty;
  activeRaffleBoxForDonate: ErgoUnsignedInput;
  activeRaffleBoxForSuccessEnd: ErgoUnsignedInput;
  activeRaffleBoxForFailureEnd: ErgoUnsignedInput;
  giftRedeemOutputBoxForFailureEnd: OutputBuilder;
  raffleDetailsBox: ErgoUnsignedInput;
  oracleBox: ErgoUnsignedInput;
  serviceFeeBox: OutputBuilder;
  implementerFeeBox: OutputBuilder;
}

interface TestInterface {
  activeRaffleTestRequirements: ActiveRaffleTestInterface;
  activeRaffleTokenGoalTestRequirements: ActiveRaffleTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock boxFactory.chain and partners
 *   - create activeRaffle input box
 *   - create raffleDetails input box
 *   - create oracle box
 *   - create service output box
 *   - create implementerFee output box
 * @returns object
 */
const provideActiveRaffleEndTestRequirements = (
  winnersCount: number = 1,
  collectingTokenId?: string,
): ActiveRaffleTestInterface => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 10 },
    constants.scriptList.filter(
      (value) => value != 'activeRaffle',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(11);

  const totalSuccessSoldTickets = 1000n;
  const ticketPrice = collectingTokenId === undefined ? 100_000n : 10n;
  const totalRaised = totalSuccessSoldTickets * ticketPrice;
  const goal = totalSuccessSoldTickets * ticketPrice;
  const collectingTokenForSuccess =
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: totalRaised + 1n,
        }
      : undefined;
  const implementerFeePercent = 100n;
  const serviceFeePercent = 200n;

  const { project, implementer, someone, donator } = boxFactory.createPartners({
    project: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
    implementer: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
    someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  donator.addBalance({
    tokens: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1_000n }],
  });
  someone.addBalance({
    tokens: [{ tokenId: ARBITRARY_TOKEN_ID, amount: 1_000n }],
  });

  // Created activeRaffle & raffleDetails input boxes
  const activeRaffleBoxForDonate = boxFactory.createActiveRaffleBoxMock(
    project.ergoTree,
    implementer.ergoTree,
    project.ergoTree,
    winnersCount,
    serviceFeePercent,
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: 1n,
        }
      : undefined,
    1_000_000n,
    1_000_000_000n,
    1_000n,
    0n,
    undefined,
    ticketPrice,
  );

  activeRaffleBoxForDonate.setContextExtension({
    0: SColl(SColl(SByte), [Array.from(Buffer.from(donator.ergoTree, 'hex'))]),
  });

  const activeRaffleBoxForSuccessEnd = boxFactory.createActiveRaffleBoxMock(
    project.ergoTree,
    implementer.ergoTree,
    project.ergoTree,
    winnersCount,
    serviceFeePercent,
    collectingTokenForSuccess,
    1_000_000n,
    1_001_000_000n,
    1_000n,
    totalSuccessSoldTickets,
    goal,
    ticketPrice,
  );
  activeRaffleBoxForSuccessEnd.setContextExtension({
    0: SColl(SColl(SByte), [
      Array.from(Buffer.from(project.ergoTree, 'hex')),
      Array.from(Buffer.from(implementer.ergoTree, 'hex')),
    ]),
  });

  const activeRaffleBoxForFailureEnd = boxFactory.createActiveRaffleBoxMock(
    project.ergoTree,
    implementer.ergoTree,
    project.ergoTree,
    winnersCount,
    serviceFeePercent,
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: 81n,
        }
      : undefined,
    1_000_000n,
    1_000_000_000n,
    1_000n,
    8n,
    goal,
    ticketPrice,
  );

  const raffleDetailsBox = boxFactory.createRaffleDetailsBoxMock(
    testUtils.TestConstants.TICKET_TOKEN_ID,
  );

  const giftRedeemOutputBoxForFailureEnd = boxFactory.createGiftRedeemOutputBox(
    BigInt(activeRaffleBoxForFailureEnd.value) +
      BigInt(raffleDetailsBox.value) -
      testUtils.TestConstants.FEE,
    8n,
    ticketPrice,
    winnersCount,
    1,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    // added by one token on the raffle-details box
    BigInt(activeRaffleBoxForFailureEnd.assets[1].amount.toString()) + 1n,
    collectingTokenId !== undefined
      ? {
          tokenId: testUtils.TestConstants.X_TOKEN_ID,
          amount: 8n * ticketPrice + 1n,
        }
      : undefined,
  );

  const oracleBox = boxFactory.createMockedOracleUTxO(
    testUtils.TestConstants.FEE,
  );
  const serviceFeeBox = boxFactory.createSafePayOutputBox(
    collectingTokenId === undefined
      ? BigInt((totalRaised * serviceFeePercent) / 1000n) +
          2n * testUtils.TestConstants.FEE
      : 2n * testUtils.TestConstants.FEE,
    collectingTokenId === undefined
      ? []
      : [
          {
            tokenId: collectingTokenId,
            amount: (totalRaised * serviceFeePercent) / 1000n,
          },
        ],
    blake2b256(Buffer.from(project.ergoTree, 'hex')),
  );
  const implementerFeeBox = boxFactory.createSafePayOutputBox(
    collectingTokenId === undefined
      ? BigInt((totalRaised * implementerFeePercent) / 1000n) +
          2n * testUtils.TestConstants.FEE
      : 2n * testUtils.TestConstants.FEE,
    collectingTokenId === undefined
      ? []
      : [
          {
            tokenId: collectingTokenId,
            amount: (totalRaised * implementerFeePercent) / 1000n,
          },
        ],
    blake2b256(Buffer.from(implementer.ergoTree, 'hex')),
  );

  return {
    boxFactory: boxFactory,
    donatorWallet: donator,
    projectWallet: project,
    implementerWallet: implementer,
    someoneWallet: someone,
    activeRaffleBoxForDonate: activeRaffleBoxForDonate,
    activeRaffleBoxForSuccessEnd: activeRaffleBoxForSuccessEnd,
    activeRaffleBoxForFailureEnd: activeRaffleBoxForFailureEnd,
    giftRedeemOutputBoxForFailureEnd: giftRedeemOutputBoxForFailureEnd,
    raffleDetailsBox: raffleDetailsBox,
    oracleBox: oracleBox,
    serviceFeeBox: serviceFeeBox,
    implementerFeeBox: implementerFeeBox,
  };
};

describe('ActiveRaffle', () => {
  beforeEach<TestInterface>((ctx) => {
    ctx.activeRaffleTestRequirements =
      provideActiveRaffleEndTestRequirements(1);
    ctx.activeRaffleTokenGoalTestRequirements =
      provideActiveRaffleEndTestRequirements(
        1,
        testUtils.TestConstants.X_TOKEN_ID,
      );
  });

  describe('Donation', () => {
    /**
     * @target should successfully donate to erg-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully donate to erg-goal raffle', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      const serviceFeePercent = 200n;

      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          activeRaffleTest.implementerWallet.ergoTree,
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_500_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            5n,
          undefined,
          5n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        5n,
        testUtils.TestConstants.TICKET_TOKEN_ID,
        [0n, 5n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      const result = activeRaffleTest.boxFactory.chain.execute(transaction);

      expect(result).toBeTruthy();
    });

    /**
     * @target should successfully donate to token-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully donate to token-goal raffle', ({
      activeRaffleTokenGoalTestRequirements: activeRaffleTokenGoalTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTokenGoalTest.projectWallet.ergoTree,
          activeRaffleTokenGoalTest.implementerWallet.ergoTree,
          activeRaffleTokenGoalTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          {
            tokenId: testUtils.TestConstants.X_TOKEN_ID,
            amount: 51n,
          },
          1_000_000n,
          1_000_000_000n,
          // one ticket-token move to the ticket box
          BigInt(
            activeRaffleTokenGoalTest.activeRaffleBoxForDonate.assets[1].amount,
          ) - 5n,
          undefined,
          5n,
          1000n,
        );
      const ticketOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createTicketOutputBox(
          activeRaffleTokenGoalTest.donatorWallet.ergoTree,
          5n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          [0n, 5n, 10n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
        );

      const transaction = new TransactionBuilder(
        activeRaffleTokenGoalTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTokenGoalTest.activeRaffleBoxForDonate,
          ...activeRaffleTokenGoalTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTokenGoalTest.donatorWallet.ergoTree)
        .build();

      const result =
        activeRaffleTokenGoalTest.boxFactory.chain.execute(transaction);

      expect(result).toBeTruthy();
    });

    /**
     * @target should fail if the user receives more tickets than donated for erg-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if the user receives more tickets than donated for erg-goal raffle', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          activeRaffleTest.implementerWallet.ergoTree,
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_001_400_000n,
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            14n,
          undefined,
          14n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        14n,
        testUtils.TestConstants.TICKET_TOKEN_ID,
        // put extra range to the output ticket box
        [0n, 15n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if the user receives more tickets than donated for token-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if the user receives more tickets than donated for token-goal raffle', ({
      activeRaffleTokenGoalTestRequirements: activeRaffleTokenGoalTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTokenGoalTest.projectWallet.ergoTree,
          activeRaffleTokenGoalTest.implementerWallet.ergoTree,
          activeRaffleTokenGoalTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          {
            tokenId: testUtils.TestConstants.X_TOKEN_ID,
            amount: 141n,
          },
          1_000_000n,
          1_000_000_000n,
          BigInt(
            activeRaffleTokenGoalTest.activeRaffleBoxForDonate.assets[1].amount,
          ) - 14n,
          undefined,
          14n,
          1000n,
        );
      const ticketOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createTicketOutputBox(
          activeRaffleTokenGoalTest.donatorWallet.ergoTree,
          14n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // put extra range to the output ticket box
          [0n, 15n, 10n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
        );

      const transaction = new TransactionBuilder(
        activeRaffleTokenGoalTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTokenGoalTest.activeRaffleBoxForDonate,
          ...activeRaffleTokenGoalTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTokenGoalTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTokenGoalTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if any value in the R4 register altered
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if any value in the R4 register altered', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          activeRaffleTest.implementerWallet.ergoTree,
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            1n,
          undefined,
          1n,
          0n, // set incorrect deadline value
          undefined,
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        1n,
        testUtils.TestConstants.TICKET_TOKEN_ID,
        [0n, 1n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if any value in the R5 register altered
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if any value in the R5 register altered', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          'invalid implementer address',
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            1n,
          undefined,
          1n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        1n,
        testUtils.TestConstants.TICKET_TOKEN_ID,
        [0n, 1n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if the total sold tickets in an active raffle is not correctly updated
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if the total sold tickets in an active raffle is not correctly updated', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.donatorWallet.addBalance({
        tokens: [
          {
            tokenId: testUtils.TestConstants.TICKET_TOKEN_ID,
            amount: 1n,
          },
        ],
      });
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          activeRaffleTest.implementerWallet.ergoTree,
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            1n,
          undefined,
          // set incorrect sold-tickets amount
          2n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        1n,
        testUtils.TestConstants.TICKET_TOKEN_ID,
        [0n, 1n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if token-goal active raffle box value decreases
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if token-goal active raffle box value decreases', ({
      activeRaffleTokenGoalTestRequirements: activeRaffleTokenGoalTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTokenGoalTest.projectWallet.ergoTree,
          activeRaffleTokenGoalTest.implementerWallet.ergoTree,
          activeRaffleTokenGoalTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          {
            tokenId: testUtils.TestConstants.X_TOKEN_ID,
            // move one lower amount of tokens
            amount: 21n,
          },
          1_000_000n,
          999_999_999n,
          // one ticket-token move to the ticket box
          BigInt(
            activeRaffleTokenGoalTest.activeRaffleBoxForDonate.assets[1].amount,
          ) - 2n,
          undefined,
          2n,
          1000n,
        );
      const ticketOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createTicketOutputBox(
          activeRaffleTokenGoalTest.donatorWallet.ergoTree,
          2n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          [0n, 2n, 10n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
        );

      const transaction = new TransactionBuilder(
        activeRaffleTokenGoalTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTokenGoalTest.activeRaffleBoxForDonate,
          ...activeRaffleTokenGoalTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTokenGoalTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTokenGoalTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if an arbitrary token is added to erg-goal active raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if an arbitrary token is added to erg-goal active raffle', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          activeRaffleTest.implementerWallet.ergoTree,
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            1n,
          undefined,
          1n,
          1000n,
          // add extra tokens to the output activeRaffle box
          [
            {
              tokenId: testUtils.TestConstants.X_TOKEN_ID,
              amount: 1n,
            },
          ],
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        1n,
        testUtils.TestConstants.TICKET_TOKEN_ID,
        [0n, 1n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if an arbitrary token is used in ticket box
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if an arbitrary token is used in ticket box', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          activeRaffleTest.implementerWallet.ergoTree,
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            1n,
          undefined,
          1n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        1n,
        // put invalid ticket token id
        testUtils.TestConstants.X_TOKEN_ID,
        [0n, 1n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if ticket range is not valid
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if ticket range is not valid', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      const serviceFeePercent = 200n;
      const activeRaffleOutputBox =
        activeRaffleTest.boxFactory.createActiveRaffleOutputBox(
          activeRaffleTest.projectWallet.ergoTree,
          activeRaffleTest.implementerWallet.ergoTree,
          activeRaffleTest.projectWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleTest.activeRaffleBoxForDonate.assets[1].amount) -
            1n,
          undefined,
          1n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
      const ticketOutputBox = activeRaffleTest.boxFactory.createTicketOutputBox(
        activeRaffleTest.donatorWallet.ergoTree,
        1n,
        testUtils.TestConstants.TICKET_TOKEN_ID,
        // set invalid tickets range
        [0n, 2n, 100_000n, 1000n], // from-ticket-range, to-ticket-range, ticket-price
      );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForDonate,
          ...activeRaffleTest.donatorWallet.utxos,
        ])
        .to([activeRaffleOutputBox, ticketOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(activeRaffleTest.donatorWallet.ergoTree)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });

  describe('Successful end', () => {
    /**
     * @target should successfully finalize an erg-goal raffle and split the raised fund
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully finalize an erg-goal raffle and split the raised fund', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const totalFeePercent = 300n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          activeRaffleTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([activeRaffleTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const result = activeRaffleTest.boxFactory.chain.execute(transaction);
      expect(result).toBeTruthy();
    });

    /**
     * @target should successfully finalize an token-goal raffle and split the raised fund
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully finalize an token-goal raffle and split the raised fund', ({
      activeRaffleTokenGoalTestRequirements: activeRaffleTokenGoalTest,
    }) => {
      activeRaffleTokenGoalTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const totalPrize = 2000n;
      const remainingFund = 7000n;

      const successRaffleOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createSuccessRaffleBox(
          BigInt(
            activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.value.toString(),
          ) -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[0]
            .tokenId,
          activeRaffleTokenGoalTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(
              activeRaffleTokenGoalTest.projectWallet.ergoTree,
              'hex',
            ),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          remainingFund + 1n,
          1,
          activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[1]
            .tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[1]
              .amount,
          ) + 1n,
          testUtils.TestConstants.X_TOKEN_ID,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTokenGoalTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTokenGoalTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTokenGoalTest.serviceFeeBox,
          activeRaffleTokenGoalTest.implementerFeeBox,
        ])
        .withDataFrom([activeRaffleTokenGoalTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const result =
        activeRaffleTokenGoalTest.boxFactory.chain.execute(transaction);
      expect(result).toBeTruthy();
    });

    /**
     * @target should fail with an invalid nft-id of oracle box
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with an invalid nft-id of oracle box', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);
      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const totalFeePercent = 300n;

      const oracleBox = activeRaffleTest.boxFactory.createMockedOracleUTxO(
        testUtils.TestConstants.FEE,
        // set invalid oracle token id
        testUtils.TestConstants.X_TOKEN_ID,
      );
      const winnersCount = 1;
      const totalSoldTickets = 1000n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail with an invalid creation-height of oracle box
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with an invalid creation-height of oracle box', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const totalFeePercent = 300n;

      const oracleBox = activeRaffleTest.boxFactory.createMockedOracleUTxO(
        testUtils.TestConstants.FEE,
        undefined,
        // set invalid creation-height
        50,
      );
      const winnersCount = 1;
      const totalSoldTickets = 1000n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if an arbitrary token is added to erg-goal success raffle
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if an arbitrary token is added to erg-goal success raffle', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const totalFeePercent = 300n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          activeRaffleTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
          undefined,
          // add arbitrary token
          [
            {
              tokenId: ARBITRARY_TOKEN_ID,
              amount: 10n,
            },
          ],
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
          ...activeRaffleTest.someoneWallet.utxos,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([activeRaffleTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(activeRaffleTest.projectWallet.address.toString())
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail with invalid total prize in success raffle R4 register
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with invalid total prize in success raffle R4 register', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const totalFeePercent = 300n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          activeRaffleTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          // set invalid totalPrize
          totalPrize - 1n,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([activeRaffleTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if split the raised erg incorrectly
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if split the raised erg incorrectly', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;

      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      // set invalid percents on the output fee boxes
      const invalidServiceFeePercent = 250n;
      const invalidImplementerFeePercent = 50n;
      const totalFeePercent =
        invalidImplementerFeePercent + invalidServiceFeePercent;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          activeRaffleTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const serviceFeeBox = activeRaffleTest.boxFactory.createSafePayOutputBox(
        BigInt((totalRaised * invalidServiceFeePercent) / 1000n) +
          testUtils.TestConstants.FEE * 2n,
        [],
        blake2b256(Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex')),
      );

      const implementerFeeBox =
        activeRaffleTest.boxFactory.createSafePayOutputBox(
          BigInt((totalRaised * invalidImplementerFeePercent) / 1000n) +
            testUtils.TestConstants.FEE * 2n,
          [],
          blake2b256(
            Buffer.from(activeRaffleTest.implementerWallet.ergoTree, 'hex'),
          ),
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
        .withDataFrom([activeRaffleTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if split the raised token incorrectly
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if split the raised token incorrectly', ({
      activeRaffleTokenGoalTestRequirements: activeRaffleTokenGoalTest,
    }) => {
      activeRaffleTokenGoalTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const totalRaised = 10_000n;
      const totalPrize = 2000n;
      const remainingFund = 7000n;
      // set invalid percents on the output fee boxes
      const invalidServiceFeePercent = 250n;
      const invalidImplementerFeePercent = 50n;

      const serviceFeeBox =
        activeRaffleTokenGoalTest.boxFactory.createSafePayOutputBox(
          2n * testUtils.TestConstants.FEE,
          [
            {
              tokenId:
                activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[2]
                  .tokenId,
              amount: (totalRaised * invalidServiceFeePercent) / 1000n,
            },
          ],
          blake2b256(
            Buffer.from(
              activeRaffleTokenGoalTest.projectWallet.ergoTree,
              'hex',
            ),
          ),
        );

      const implementerFeeBox =
        activeRaffleTokenGoalTest.boxFactory.createSafePayOutputBox(
          2n * testUtils.TestConstants.FEE,
          [
            {
              tokenId:
                activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[2]
                  .tokenId,
              amount: (totalRaised * invalidImplementerFeePercent) / 1000n,
            },
          ],
          blake2b256(
            Buffer.from(
              activeRaffleTokenGoalTest.implementerWallet.ergoTree,
              'hex',
            ),
          ),
        );

      const successRaffleOutputBox =
        activeRaffleTokenGoalTest.boxFactory.createSuccessRaffleBox(
          BigInt(
            activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.value.toString(),
          ) -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[0]
            .tokenId,
          activeRaffleTokenGoalTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(
              activeRaffleTokenGoalTest.projectWallet.ergoTree,
              'hex',
            ),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          remainingFund + 1n,
          1,
          activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[1]
            .tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd.assets[1]
              .amount,
          ) + 1n,
          testUtils.TestConstants.X_TOKEN_ID,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTokenGoalTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTokenGoalTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTokenGoalTest.raffleDetailsBox,
        ])
        .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
        .withDataFrom([activeRaffleTokenGoalTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTokenGoalTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if seed in the success raffle R5 register is incorrect
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if seed in the success raffle R5 register is incorrect', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const totalFeePercent = 300n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          // set invalid seed
          'invalid seed',
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([activeRaffleTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if selected winner list in the success raffle R5 register is incorrect
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if selected winner list in the success raffle R5 register is incorrect', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const totalFeePercent = 300n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          activeRaffleTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          // set invalid selected winner list
          [0n],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([activeRaffleTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if step is incorrect in success raffle R6 register
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if step is incorrect in success raffle R6 register', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 1000n;
      const winnersPercent = 200n;
      const totalRaised = 100_000_000n;
      const totalPrize = (winnersPercent * totalRaised) / 1000n;
      const totalFeePercent = 300n;

      const successRaffleOutputBox =
        activeRaffleTest.boxFactory.createSuccessRaffleBox(
          activeRaffleTest.activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.TestConstants.FEE * 4n,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          activeRaffleTest.oracleBox.boxId.toString(),
          blake2b256(
            Buffer.from(activeRaffleTest.projectWallet.ergoTree, 'hex'),
          ),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          // set invalid step number to the R6
          2,
          activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForSuccessEnd.assets[1].amount,
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForSuccessEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([
          successRaffleOutputBox,
          activeRaffleTest.serviceFeeBox,
          activeRaffleTest.implementerFeeBox,
        ])
        .withDataFrom([activeRaffleTest.oracleBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });

  describe('Failure end', () => {
    /**
     * @target should successfully finalize a failed erg-goal raffle
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully finalize a failed erg-goal raffle', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForFailureEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([activeRaffleTest.giftRedeemOutputBoxForFailureEnd])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const result = activeRaffleTest.boxFactory.chain.execute(transaction);
      expect(result).toBeTruthy();
    });

    /**
     * @target should successfully finalize a failed token-goal raffle
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully finalize a failed token-goal raffle', ({
      activeRaffleTokenGoalTestRequirements: activeRaffleTokenGoalTest,
    }) => {
      activeRaffleTokenGoalTest.boxFactory.chain.setTip(2001);

      const transaction = new TransactionBuilder(
        activeRaffleTokenGoalTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTokenGoalTest.activeRaffleBoxForFailureEnd,
          activeRaffleTokenGoalTest.raffleDetailsBox,
        ])
        .to([activeRaffleTokenGoalTest.giftRedeemOutputBoxForFailureEnd])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const result =
        activeRaffleTokenGoalTest.boxFactory.chain.execute(transaction);
      expect(result).toBeTruthy();
    });

    /**
     * @target should fail if an arbitrary token is added to gift redeem
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if an arbitrary token is added to gift redeem', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 8n;
      const ticketPrice = 10n;

      const giftRedeemOutputBox =
        activeRaffleTest.boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleTest.activeRaffleBoxForFailureEnd.value) +
            BigInt(activeRaffleTest.raffleDetailsBox.value) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForFailureEnd.assets[1].amount.toString(),
          ) + 1n,
          undefined,
          // Add invalid arbitrary token
          [
            {
              tokenId: ARBITRARY_TOKEN_ID,
              amount: 1n,
            },
          ],
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForFailureEnd,
          activeRaffleTest.raffleDetailsBox,
          ...activeRaffleTest.someoneWallet.utxos,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(activeRaffleTest.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if any value in the R4 register is invalid
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if any value in the R4 register is invalid', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 8n;
      const ticketPrice = 10n;

      const giftRedeemOutputBox =
        activeRaffleTest.boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleTest.activeRaffleBoxForFailureEnd.value) +
            BigInt(activeRaffleTest.raffleDetailsBox.value) -
            testUtils.TestConstants.FEE,
          // set invalid totalSoldTickets value to the R4
          totalSoldTickets - 1n,
          ticketPrice,
          winnersCount,
          1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForFailureEnd.assets[1].amount.toString(),
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForFailureEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if step in the R5 register of gift redeem is invalid
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if step in the R5 register of gift redeem is invalid', ({
      activeRaffleTestRequirements: activeRaffleTest,
    }) => {
      activeRaffleTest.boxFactory.chain.setTip(2001);

      const winnersCount = 1;
      const totalSoldTickets = 8n;
      const ticketPrice = 10n;

      const giftRedeemOutputBox =
        activeRaffleTest.boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleTest.activeRaffleBoxForFailureEnd.value) +
            BigInt(activeRaffleTest.raffleDetailsBox.value) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          // set invalid step number to the R5
          2,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(
            activeRaffleTest.activeRaffleBoxForFailureEnd.assets[1].amount.toString(),
          ) + 1n,
        );

      const transaction = new TransactionBuilder(
        activeRaffleTest.boxFactory.chain.height,
      )
        .from([
          activeRaffleTest.activeRaffleBoxForFailureEnd,
          activeRaffleTest.raffleDetailsBox,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        activeRaffleTest.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });
});
