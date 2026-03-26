import { ErgoUnsignedInput, TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SColl, SLong, SConstant, SByte } from '@fleet-sdk/serializer';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

const TEST_INITIAL_SEED = '0123456789012345';

interface SuccessRaffleTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  ownerWallet: KeyedMockChainParty;
  someoneWallet: KeyedMockChainParty;
  project: KeyedMockChainParty;
  newWinnerTicketIndex: bigint;
  nextSeed: string;
  serviceBox: ErgoUnsignedInput;
  successRaffleBox: ErgoUnsignedInput;
  successRaffleForLicenseRedeemBox: ErgoUnsignedInput;
  winnerBox: ErgoUnsignedInput;
}

interface TestInterface {
  successRaffleTestRequirements: SuccessRaffleTestInterface;
  successRaffleTokenGoalTestRequirements: SuccessRaffleTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock successRaffleTestRequirements.boxFactory.chain and partners
 *   - compile contracts
 *   - create successRaffle input box
 *   - create winners input boxes
 * @returns object
 */
const provideSuccessRaffleTestRequirements = (collectingTokenId?: string) => {
  const winnersCount = 5;
  const totalPrize = 1_000_000n;
  const totalRaised = 20_000_000n;
  const totalSoldTickets = 5n;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'successRaffle',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);

  const { owner, project, someone } = boxFactory.createPartners({
    owner: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
    project: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
    someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  project.addBalance({
    tokens: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 100n }],
  });
  someone.addBalance({
    tokens: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 100n }],
  });

  // create service-box
  const serviceBox = boxFactory.createServiceBoxMock(
    owner.ergoTree,
    testUtils.TestConstants.LICENSE_TOKEN_COUNT,
    100n,
    100n,
    testUtils.TestConstants.CREATION_FEE,
  );

  // Created input successRaffle-box
  const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
    testUtils.TestConstants.FEE * 3n + testUtils.TestConstants.CREATION_FEE,
    testUtils.TestConstants.LICENSE_TOKEN_ID,
    blake2b256(Buffer.from(project.ergoTree, 'hex')),
    TEST_INITIAL_SEED,
    [],
    5n,
    winnersCount,
    totalPrize,
    totalRaised,
    1,
    undefined,
    undefined,
    collectingTokenId,
  ) as ErgoUnsignedInput;

  const newWinnerTicketIndex = testUtils.generateNextWinnerIndex(
    [],
    1,
    Uint8Array.from(Array.from(Buffer.from(TEST_INITIAL_SEED, 'hex'))),
    totalSoldTickets,
  );

  successRaffleBox.setContextExtension({
    0: SColl(SLong, []),
    1: SLong(newWinnerTicketIndex),
  });

  const successRaffleForLicenseRedeemBox =
    boxFactory.createSuccessRaffleBoxMock(
      testUtils.TestConstants.FEE * 3n + testUtils.TestConstants.CREATION_FEE,
      testUtils.TestConstants.LICENSE_TOKEN_ID,
      blake2b256(Buffer.from(project.ergoTree, 'hex')),
      TEST_INITIAL_SEED,
      [],
      5n,
      winnersCount,
      totalPrize,
      totalRaised,
      6,
      undefined,
      undefined,
      collectingTokenId,
    ) as ErgoUnsignedInput;

  const winnerBox = boxFactory.createWinnerSingleBoxMock(
    1,
    winnersCount,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    undefined,
    2000n,
    0n,
    testUtils.TestConstants.GIFT_TOKEN_ID,
    [
      {
        tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
        amount: 1000n,
      },
    ],
  );

  const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString('hex');

  return {
    boxFactory: boxFactory,
    someoneWallet: someone,
    ownerWallet: owner,
    project: project,
    newWinnerTicketIndex: newWinnerTicketIndex,
    nextSeed: nextSeed,
    serviceBox: serviceBox,
    successRaffleBox: successRaffleBox,
    successRaffleForLicenseRedeemBox: successRaffleForLicenseRedeemBox,
    winnerBox: winnerBox,
  };
};

describe('successRaffle', () => {
  beforeEach<TestInterface>(async (ctx) => {
    ctx.successRaffleTestRequirements = provideSuccessRaffleTestRequirements();
    ctx.successRaffleTokenGoalTestRequirements =
      provideSuccessRaffleTestRequirements(testUtils.TestConstants.X_TOKEN_ID);
  });

  describe('winner prize creation', () => {
    /**
     * @target should successfully create winner prize for an erg-goal raffle
     * @scenario
     * - create two output boxes by values
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully create winner prize for an erg-goal raffle', ({
      successRaffleTestRequirements,
    }) => {
      successRaffleTestRequirements.boxFactory.chain.setTip(2000);

      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.successRaffleBox,
          successRaffleTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        successRaffleTestRequirements.boxFactory.chain.execute(transaction);

      expect(res).toBeTruthy();
    });

    /**
     * @target should successfully create winner prize for a token-goal raffle
     * @scenario
     * - create three output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should successfully create winner prize for a token-goal raffle', ({
      successRaffleTokenGoalTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;
      const prizeOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n,
          1,
          successRaffleTokenGoalTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTokenGoalTestRequirements.winnerBox.assets[1].amount,
          {
            tokenId: testUtils.TestConstants.X_TOKEN_ID,
            amount: (totalPrize * rewardPercent) / 1000n,
          },
        );
      const successRaffleOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleTokenGoalTestRequirements.successRaffleBox.value,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTokenGoalTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(
              successRaffleTokenGoalTestRequirements.project.ergoTree,
              'hex',
            ),
          ),
          [successRaffleTokenGoalTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          successRaffleTokenGoalTestRequirements.successRaffleBox.assets[2]
            .amount -
            (totalPrize * rewardPercent) / 1000n,
          2,
          undefined,
          undefined,
          testUtils.TestConstants.X_TOKEN_ID,
        );

      const transaction = new TransactionBuilder(
        successRaffleTokenGoalTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTokenGoalTestRequirements.successRaffleBox,
          successRaffleTokenGoalTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        successRaffleTokenGoalTestRequirements.boxFactory.chain.execute(
          transaction,
        );

      expect(res).toBeTruthy();
    });

    /**
     * @target should successfully create winner prize for a token-goal raffle by zero reward percent
     * @scenario
     * - create three output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should successfully create winner prize for a token-goal raffle by zero reward percent', ({
      successRaffleTokenGoalTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 0n;
      const totalSoldTickets = 5n;

      const winnerBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createWinnerSingleBoxMock(
          1,
          winnersCount,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          undefined,
          0n,
          0n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

      const prizeOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n,
          1,
          successRaffleTokenGoalTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTokenGoalTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleTokenGoalTestRequirements.successRaffleBox.value,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTokenGoalTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(
              successRaffleTokenGoalTestRequirements.project.ergoTree,
              'hex',
            ),
          ),
          [successRaffleTokenGoalTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          successRaffleTokenGoalTestRequirements.successRaffleBox.assets[2]
            .amount -
            (totalPrize * rewardPercent) / 1000n,
          2,
          undefined,
          undefined,
          testUtils.TestConstants.X_TOKEN_ID,
        );

      const transaction = new TransactionBuilder(
        successRaffleTokenGoalTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTokenGoalTestRequirements.successRaffleBox,
          winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        successRaffleTokenGoalTestRequirements.boxFactory.chain.execute(
          transaction,
        );

      expect(res).toBeTruthy();
    });

    /**
     * @target should fail with wrong calculated winner ticket index
     * @scenario
     * - create two output boxes by invalid ticket-index
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with wrong calculated winner ticket index', ({
      successRaffleTestRequirements,
    }) => {
      successRaffleTestRequirements.boxFactory.chain.setTip(2000);

      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;
      // calculate invalid ticket-index
      const invalidWinnerTicketIndex =
        (testUtils.generateNextWinnerIndex(
          [],
          1,
          Uint8Array.from(Array.from(Buffer.from(TEST_INITIAL_SEED, 'hex'))),
          totalSoldTickets,
        ) +
          1n) %
        BigInt(winnersCount);

      successRaffleTestRequirements.successRaffleBox.setContextExtension({
        0: SColl(SLong, []),
        // put invalid ticket index to the context vars
        1: SLong(invalidWinnerTicketIndex),
      });

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          // put invalid ticket index to winnerPrize box
          invalidWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          // put invalid ticket index to the successRaffle box
          [invalidWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.successRaffleBox,
          successRaffleTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail with wrong selected winner list in transaction context
     * @scenario
     * - create successRaffle input box by invalid ticket-index list
     * - create two output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with wrong selected winner list in transaction context', ({
      successRaffleTestRequirements,
    }) => {
      successRaffleTestRequirements.boxFactory.chain.setTip(2000);

      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const totalRaised = 20_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      // Created input successRaffle-box
      const successRaffleBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBoxMock(
          testUtils.TestConstants.FEE * 3n +
            testUtils.TestConstants.CREATION_FEE,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          TEST_INITIAL_SEED,
          // set invalid ticket-index list
          [0n],
          5n,
          winnersCount,
          totalPrize,
          totalRaised,
          1,
        ) as ErgoUnsignedInput;

      successRaffleBox.setContextExtension({
        0: SColl(SLong, []),
        1: SLong(successRaffleTestRequirements.newWinnerTicketIndex),
      });

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([successRaffleBox, successRaffleTestRequirements.winnerBox])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail with duplicated winner ticket index
     * @scenario
     * - create successRaffle input box
     * - put duplicated winner ticket index on the context-vars of the successRaffle
     * - create two output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with duplicated winner ticket index', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;
      const totalPrize = 1_000_000n;
      const prizeValue = totalPrize;
      // set invalid special value that make the sameSelectedWinners size
      // more than zero on the contract
      const newWinnerTicketIndex = 1n;

      const successRaffleBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBoxMock(
          testUtils.TestConstants.FEE,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          TEST_INITIAL_SEED,
          [successRaffleTestRequirements.newWinnerTicketIndex],
          5n,
          winnersCount,
          totalPrize,
          prizeValue,
          2,
        ) as ErgoUnsignedInput;

      successRaffleBox.setContextExtension({
        0: SColl(SLong, [successRaffleTestRequirements.newWinnerTicketIndex]),
        1: SLong(newWinnerTicketIndex),
      });

      const winnerBox =
        successRaffleTestRequirements.boxFactory.createWinnerSingleBoxMock(
          2,
          winnersCount,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          undefined,
          BigInt(2000),
          0n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          2,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [
            successRaffleTestRequirements.newWinnerTicketIndex,
            newWinnerTicketIndex,
          ],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          3,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([successRaffleBox, winnerBox])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if wrong winner ticket index is set on winner prize box
     * @scenario
     * - create successRaffle output boxes
     * - create winnerPrize output box by invalid winner ticket index
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if wrong winner ticket index is set on winner prize box', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          // set invalid winner ticket index
          successRaffleTestRequirements.newWinnerTicketIndex + 1n,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.successRaffleBox,
          successRaffleTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if input winner box belongs to another raffle
     * @scenario
     * - create input winner box by different raffle ticket token
     * - create two output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if input winner box belongs to another raffle', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const anotherRaffleTicketId = '0'.repeat(64);
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const winnerBox =
        successRaffleTestRequirements.boxFactory.createWinnerSingleBoxMock(
          1,
          winnersCount,
          // Set another raffle ticket-id
          anotherRaffleTicketId,
          undefined,
          BigInt(2000),
          0n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
          undefined,
          anotherRaffleTicketId,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([successRaffleTestRequirements.successRaffleBox, winnerBox])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if input winner box does not match with step on success raffle
     * @scenario
     * - create two output boxes
     * - execute transaction by winner box with invalid index
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if input winner box does not match with step on success raffle', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const winnerBox =
        successRaffleTestRequirements.boxFactory.createWinnerSingleBoxMock(
          2,
          winnersCount,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          undefined,
          BigInt(2000),
          0n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          2,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        // use invalid winner box
        .from([successRaffleTestRequirements.successRaffleBox, winnerBox])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail with wrong selected winner list in success raffle output box
     * @scenario
     * - create successRaffle output box by invalid selectedWinnersList
     * - create winnerPrize output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with wrong selected winner list in success raffle output box', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          // set invalid selectedWinnersList
          [successRaffleTestRequirements.newWinnerTicketIndex + 1n],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.successRaffleBox,
          successRaffleTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail with wrong seed in success raffle output box
     * @scenario
     * - create successRaffle output box by invalid seed
     * - create winnerPrize output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail with wrong seed in success raffle output box', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          // set invalid seed
          'invalid seed',
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.successRaffleBox,
          successRaffleTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if in a erg-goal raffle funds are deducted more than required prize of the selected winner
     * @scenario
     * - create successRaffle output box
     * - create winnerPrize output box by extra amount of erg
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if in a erg-goal raffle funds are deducted more than required prize of the selected winner', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          // put 100 more nano-ergs to this box
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n +
            100n,
          1,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.successRaffleBox,
          successRaffleTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if in a token-goal raffle funds are deducted more than required prize of the selected winner
     * @scenario
     * - create successRaffle output box
     * - create winnerPrize output box by extra collecting token
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if in a token-goal raffle funds are deducted more than required prize of the selected winner', ({
      successRaffleTokenGoalTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const prizeOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n,
          1,
          successRaffleTokenGoalTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTokenGoalTestRequirements.winnerBox.assets[1].amount,
          {
            tokenId: testUtils.TestConstants.X_TOKEN_ID,
            // put 1 more token to this box
            amount: (totalPrize * rewardPercent) / 1000n + 1n,
          },
        );
      const successRaffleOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleTokenGoalTestRequirements.successRaffleBox.value,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTokenGoalTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(
              successRaffleTokenGoalTestRequirements.project.ergoTree,
              'hex',
            ),
          ),
          [successRaffleTokenGoalTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          successRaffleTokenGoalTestRequirements.successRaffleBox.assets[2]
            .amount -
            (totalPrize * rewardPercent) / 1000n -
            1n,
          2,
          undefined,
          undefined,
          testUtils.TestConstants.X_TOKEN_ID,
        );

      const transaction = new TransactionBuilder(
        successRaffleTokenGoalTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTokenGoalTestRequirements.successRaffleBox,
          successRaffleTokenGoalTestRequirements.winnerBox,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTokenGoalTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

    /**
     * @target should fail if an arbitrary token is added to erg-goal success raffle
     * @scenario
     * - create successRaffle output box by extra arbitrary token
     * - create winnerPrize output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if an arbitrary token is added to erg-goal success raffle', ({
      successRaffleTestRequirements,
    }) => {
      const winnersCount = 5;
      const totalPrize = 1_000_000n;
      const rewardPercent = 200n;
      const totalSoldTickets = 5n;

      const prizeOutputBox =
        successRaffleTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n +
            (totalPrize * rewardPercent) / 1000n,
          1,
          successRaffleTestRequirements.newWinnerTicketIndex,
          1n,
          0n,
          successRaffleTestRequirements.winnerBox.assets[1].amount,
        );
      const successRaffleOutputValue =
        BigInt(successRaffleTestRequirements.winnerBox.value) +
        successRaffleTestRequirements.successRaffleBox.value -
        prizeOutputBox.value -
        testUtils.TestConstants.FEE;
      const successRaffleOutputBox =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          successRaffleTestRequirements.nextSeed,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          [successRaffleTestRequirements.newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
          undefined,
          undefined,
          undefined,
          // Put invalid extra token to the box
          [
            {
              tokenId: testUtils.TestConstants.X_TOKEN_ID,
              amount: 1n,
            },
          ],
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.winnerBox,
          successRaffleTestRequirements.successRaffleBox,
          ...successRaffleTestRequirements.someoneWallet.utxos,
        ])
        .to([successRaffleOutputBox, prizeOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(successRaffleTestRequirements.someoneWallet.address)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });

  describe('license redeem', () => {
    /**
     * @target should successfully return license token and pay the project fund for an erg-goal raffle
     * @scenario
     * - create two output boxes
     * - execute transaction and burn current raffle related ticket tokens
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully return license token and pay the project fund for an erg-goal raffle', ({
      successRaffleTestRequirements,
    }) => {
      const serviceR4 = SConstant.from(
        successRaffleTestRequirements.serviceBox.additionalRegisters.R4!,
      ).data as bigint[];
      const serviceFeePercent = serviceR4[0];
      const implementerFeePercent = serviceR4[1];
      const serviceOutputBox =
        successRaffleTestRequirements.boxFactory.createServiceOutputBox(
          successRaffleTestRequirements.serviceBox.ergoTree,
          successRaffleTestRequirements.serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );
      successRaffleTestRequirements.successRaffleForLicenseRedeemBox.setContextExtension(
        {
          0: SColl(SByte, successRaffleTestRequirements.project.ergoTree),
        },
      );

      const projectFund =
        successRaffleTestRequirements.boxFactory.createSafePayOutputBox(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox.value -
            testUtils.TestConstants.FEE,
          [],
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.serviceBox,
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox,
        ])
        .to([serviceOutputBox, projectFund])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn ticket tokens
        .burnTokens(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox
            .assets[1],
        )
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        successRaffleTestRequirements.boxFactory.chain.execute(transaction);

      expect(res).toBeTruthy();
    });

    /**
     * @target should successfully return license token and pay the project fund for a token-goal raffle
     * @scenario
     * - create two output boxes
     * - execute transaction and burn current raffle related ticket tokens
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully return license token and pay the project fund for a token-goal raffle', ({
      successRaffleTokenGoalTestRequirements,
    }) => {
      const serviceR4 = SConstant.from(
        successRaffleTokenGoalTestRequirements.serviceBox.additionalRegisters
          .R4!,
      ).data as bigint[];
      const serviceFeePercent = serviceR4[0];
      const implementerFeePercent = serviceR4[1];
      const serviceOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createServiceOutputBox(
          successRaffleTokenGoalTestRequirements.serviceBox.ergoTree,
          successRaffleTokenGoalTestRequirements.serviceBox.assets[1].amount +
            1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );
      successRaffleTokenGoalTestRequirements.successRaffleForLicenseRedeemBox.setContextExtension(
        {
          0: SColl(
            SByte,
            successRaffleTokenGoalTestRequirements.project.ergoTree,
          ),
        },
      );

      const projectFund =
        successRaffleTokenGoalTestRequirements.boxFactory.createSafePayOutputBox(
          successRaffleTokenGoalTestRequirements
            .successRaffleForLicenseRedeemBox.value -
            testUtils.TestConstants.FEE,
          [
            successRaffleTokenGoalTestRequirements
              .successRaffleForLicenseRedeemBox.assets[2],
          ],
          blake2b256(
            Buffer.from(
              successRaffleTokenGoalTestRequirements.project.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        successRaffleTokenGoalTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTokenGoalTestRequirements.serviceBox,
          successRaffleTokenGoalTestRequirements.successRaffleForLicenseRedeemBox,
        ])
        .to([serviceOutputBox, projectFund])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn ticket tokens
        .burnTokens(
          successRaffleTokenGoalTestRequirements
            .successRaffleForLicenseRedeemBox.assets[1],
        )
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        successRaffleTokenGoalTestRequirements.boxFactory.chain.execute(
          transaction,
        );

      expect(res).toBeTruthy();
    });

    /**
     * @target should fail if service box has a different service nft
     * @scenario
     * - create successRaffle output box by invalid nft id
     * - create projectFund output box
     * - execute transaction and burn current raffle related ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if service box has a different service nft', ({
      successRaffleTestRequirements,
    }) => {
      const serviceBox =
        successRaffleTestRequirements.boxFactory.createServiceBoxMock(
          successRaffleTestRequirements.ownerWallet.ergoTree,
          testUtils.TestConstants.LICENSE_TOKEN_COUNT,
          100n,
          100n,
          testUtils.TestConstants.CREATION_FEE,
          undefined,
          testUtils.TestConstants.X_TOKEN_ID,
        );

      const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
        .data as bigint[];
      const serviceFeePercent = serviceR4[0];
      const implementerFeePercent = serviceR4[1];
      const serviceOutputBox =
        successRaffleTestRequirements.boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
          undefined,
          // set invalid nft id
          testUtils.TestConstants.X_TOKEN_ID,
        );

      const projectFund =
        successRaffleTestRequirements.boxFactory.createSafePayOutputBox(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox.value -
            testUtils.TestConstants.FEE,
          [],
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          serviceBox,
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox,
        ])
        .to([serviceOutputBox, projectFund])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn ticket tokens
        .burnTokens(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox
            .assets[1],
        )
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(successRaffleTestRequirements.someoneWallet.address)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if project fund withdrawal is incorrect for an erg-goal raffle
     * @scenario
     * - create successRaffle output box
     * - create projectFund output box by invalid value
     * - execute transaction and burn current raffle related ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if project fund withdrawal is incorrect for an erg-goal raffle', ({
      successRaffleTestRequirements,
    }) => {
      const serviceR4 = SConstant.from(
        successRaffleTestRequirements.serviceBox.additionalRegisters.R4!,
      ).data as bigint[];
      const serviceFeePercent = serviceR4[0];
      const implementerFeePercent = serviceR4[1];

      const serviceOutputBox =
        successRaffleTestRequirements.boxFactory.createServiceOutputBox(
          successRaffleTestRequirements.serviceBox.ergoTree,
          successRaffleTestRequirements.serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

      const projectFund =
        successRaffleTestRequirements.boxFactory.createSafePayOutputBox(
          // invalid value: minus one extra fee value
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox.value -
            testUtils.TestConstants.FEE -
            testUtils.TestConstants.FEE,
          [],
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.serviceBox,
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox,
        ])
        .to([serviceOutputBox, projectFund])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn ticket tokens
        .burnTokens(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox
            .assets[1],
        )
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(successRaffleTestRequirements.project.address)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if project fund withdrawal is incorrect for a token-goal raffle
     * @scenario
     * - create successRaffle output box
     * - create projectFund output box by invalid collecting token amount
     * - execute transaction and burn current raffle related ticket tokens and some of collecting token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if project fund withdrawal is incorrect for a token-goal raffle', ({
      successRaffleTokenGoalTestRequirements,
    }) => {
      const serviceR4 = SConstant.from(
        successRaffleTokenGoalTestRequirements.serviceBox.additionalRegisters
          .R4!,
      ).data as bigint[];
      const serviceFeePercent = serviceR4[0];
      const implementerFeePercent = serviceR4[1];
      const serviceOutputBox =
        successRaffleTokenGoalTestRequirements.boxFactory.createServiceOutputBox(
          successRaffleTokenGoalTestRequirements.serviceBox.ergoTree,
          successRaffleTokenGoalTestRequirements.serviceBox.assets[1].amount +
            1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

      const projectFund =
        successRaffleTokenGoalTestRequirements.boxFactory.createSafePayOutputBox(
          successRaffleTokenGoalTestRequirements
            .successRaffleForLicenseRedeemBox.value -
            testUtils.TestConstants.FEE,
          [
            {
              tokenId:
                successRaffleTokenGoalTestRequirements
                  .successRaffleForLicenseRedeemBox.assets[2].tokenId,
              // invalid value: minus one extra collecting token
              amount:
                BigInt(
                  successRaffleTokenGoalTestRequirements
                    .successRaffleForLicenseRedeemBox.assets[2].amount,
                ) - 1n,
            },
          ],
          blake2b256(
            Buffer.from(
              successRaffleTokenGoalTestRequirements.project.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        successRaffleTokenGoalTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTokenGoalTestRequirements.serviceBox,
          successRaffleTokenGoalTestRequirements.successRaffleForLicenseRedeemBox,
        ])
        .to([serviceOutputBox, projectFund])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn ticket tokens
        .burnTokens([
          successRaffleTokenGoalTestRequirements
            .successRaffleForLicenseRedeemBox.assets[1],
          {
            tokenId:
              successRaffleTokenGoalTestRequirements
                .successRaffleForLicenseRedeemBox.assets[2].tokenId,
            amount: 1n,
          },
        ])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTokenGoalTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

    /**
     * @target should fail if a ticket token is stolen
     * @scenario
     * - create successRaffle output box
     * - create projectFund output box by one stole ticket token
     * - execute transaction and burn current raffle related ticket tokens and some of collecting token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if a ticket token is stolen', ({
      successRaffleTestRequirements,
    }) => {
      const serviceR4 = SConstant.from(
        successRaffleTestRequirements.serviceBox.additionalRegisters.R4!,
      ).data as bigint[];
      const serviceFeePercent = serviceR4[0];
      const implementerFeePercent = serviceR4[1];

      const serviceOutputBox =
        successRaffleTestRequirements.boxFactory.createServiceOutputBox(
          successRaffleTestRequirements.serviceBox.ergoTree,
          successRaffleTestRequirements.serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

      const projectFund =
        successRaffleTestRequirements.boxFactory.createSafePayOutputBox(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox.value -
            testUtils.TestConstants.FEE,
          [
            // stole one ticket token
            {
              tokenId:
                successRaffleTestRequirements.successRaffleForLicenseRedeemBox
                  .assets[1].tokenId,
              amount: 1n,
            },
          ],
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.serviceBox,
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox,
        ])
        .to([serviceOutputBox, projectFund])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn ticket tokens
        .burnTokens([
          {
            tokenId:
              successRaffleTestRequirements.successRaffleForLicenseRedeemBox
                .assets[1].tokenId,
            amount:
              BigInt(
                successRaffleTestRequirements.successRaffleForLicenseRedeemBox
                  .assets[1].amount,
              ) - 1n,
          },
        ])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if a raffle license is stolen with spending two similar success raffles
     * @scenario
     * - create three output boxes
     * - execute transaction and burn current raffle related ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if a raffle license is stolen with spending two similar success raffles', ({
      successRaffleTestRequirements,
    }) => {
      const serviceR4 = SConstant.from(
        successRaffleTestRequirements.serviceBox.additionalRegisters.R4!,
      ).data as bigint[];
      const serviceFeePercent = serviceR4[0];
      const implementerFeePercent = serviceR4[1];

      const successRaffleForLicenseRedeemBox2 =
        successRaffleTestRequirements.boxFactory.createSuccessRaffleBoxMock(
          testUtils.TestConstants.FEE * 3n +
            testUtils.TestConstants.CREATION_FEE,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
          TEST_INITIAL_SEED,
          [],
          5n,
          5,
          5n,
          50n,
          6,
          testUtils.TestConstants.X_TOKEN_ID,
        ) as ErgoUnsignedInput;

      const serviceOutputBox =
        successRaffleTestRequirements.boxFactory.createServiceOutputBox(
          successRaffleTestRequirements.serviceBox.ergoTree,
          successRaffleTestRequirements.serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

      const projectFund =
        successRaffleTestRequirements.boxFactory.createSafePayOutputBox(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox.value -
            testUtils.TestConstants.FEE,
          [],
          blake2b256(
            Buffer.from(successRaffleTestRequirements.project.ergoTree, 'hex'),
          ),
        );

      const transaction = new TransactionBuilder(
        successRaffleTestRequirements.boxFactory.chain.height,
      )
        .from([
          successRaffleTestRequirements.serviceBox,
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox,
          successRaffleForLicenseRedeemBox2,
          ...successRaffleTestRequirements.someoneWallet.utxos,
        ])
        .to([serviceOutputBox, projectFund])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn ticket tokens
        .burnTokens(
          successRaffleTestRequirements.successRaffleForLicenseRedeemBox
            .assets[1],
        )
        .sendChangeTo(successRaffleTestRequirements.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        successRaffleTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });
});
