import { it, describe, expect } from 'vitest';
import { ErgoUnsignedInput, TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { SColl, SLong, SConstant } from '@fleet-sdk/serializer';

import * as testUtils from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

const TEST_INITIAL_SEED = '0123456789012345';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create successRaffle input box
 *   - create winners input boxes
 * @returns vitest customized "it" object
 */
const createSuccessRaffleTest = (collectingTokenId?: string) => {
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

  const { owner, creator, someone } = boxFactory.createPartners({
    owner: testUtils.CREATOR_DEFAULT_BALANCE,
    creator: testUtils.CREATOR_DEFAULT_BALANCE,
    someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });
  someone.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });

  // create service-box
  const serviceBox = boxFactory.createServiceBoxMock(
    owner.ergoTree,
    testUtils.LICENSE_TOKEN_COUNT,
    100n,
    100n,
    testUtils.CREATION_FEE,
  );

  // Created input successRaffle-box
  const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
    testUtils.FEE * 3n + testUtils.CREATION_FEE,
    testUtils.LICENSE_TOKEN_ID,
    blake2b256(Buffer.from(creator.ergoTree, 'hex')),
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
      testUtils.FEE * 3n + testUtils.CREATION_FEE,
      testUtils.LICENSE_TOKEN_ID,
      blake2b256(Buffer.from(creator.ergoTree, 'hex')),
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
    testUtils.TICKET_TOKEN_ID,
    undefined,
    2000n,
    0n,
    testUtils.GIFT_TOKEN_ID,
    [
      {
        tokenId: testUtils.GIFT_TOKEN_ID,
        amount: 1000n,
      },
    ],
  );

  const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString('hex');

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    ownerWallet: owner,
    creator: creator,
    newWinnerTicketIndex: newWinnerTicketIndex,
    nextSeed: nextSeed,
    serviceBox: serviceBox,
    successRaffleBox: successRaffleBox,
    successRaffleForLicenseRedeemBox: successRaffleForLicenseRedeemBox,
    winnerBox: winnerBox,
  });
};

describe('successRaffle', () => {
  const successRaffleTest = createSuccessRaffleTest();
  const successRaffleTokenGoalTest = createSuccessRaffleTest(
    testUtils.X_TOKEN_ID,
  );

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
    successRaffleTest(
      'should successfully create winner prize for an erg-goal raffle',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        winnerBox,
        successRaffleBox,
      }) => {
        boxFactory.chain.setTip(2000);

        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should successfully create winner prize for a token-goal raffle
     * @scenario
     * - create three output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTokenGoalTest(
      'should successfully create winner prize for a token-goal raffle',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        winnerBox,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;
        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: (totalPrize * rewardPercent) / 1000n,
          },
        );
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleBox.value,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          successRaffleBox.assets[2].amount -
            (totalPrize * rewardPercent) / 1000n,
          2,
          undefined,
          undefined,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should successfully create winner prize for a token-goal raffle by zero reward percent
     * @scenario
     * - create three output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTokenGoalTest(
      'should successfully create winner prize for a token-goal raffle by zero reward percent',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 0n;
        const totalSoldTickets = 5n;

        const winnerBox = boxFactory.createWinnerSingleBoxMock(
          1,
          winnersCount,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          0n,
          0n,
          testUtils.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleBox.value,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          successRaffleBox.assets[2].amount -
            (totalPrize * rewardPercent) / 1000n,
          2,
          undefined,
          undefined,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should fail with wrong calculated winner ticket index
     * @scenario
     * - create two output boxes by invalid ticket-index
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail with wrong calculated winner ticket index',
      ({ boxFactory, creator, nextSeed, winnerBox, successRaffleBox }) => {
        boxFactory.chain.setTip(2000);

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

        successRaffleBox.setContextExtension({
          0: SColl(SLong, []),
          // put invalid ticket index to the context vars
          1: SLong(invalidWinnerTicketIndex),
        });

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          // put invalid ticket index to winnerPrize box
          invalidWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          // put invalid ticket index to the successRaffle box
          [invalidWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail with wrong selected winner list in transaction context',
      ({ boxFactory, creator, newWinnerTicketIndex, nextSeed, winnerBox }) => {
        boxFactory.chain.setTip(2000);

        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const totalRaised = 20_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        // Created input successRaffle-box
        const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
          testUtils.FEE * 3n + testUtils.CREATION_FEE,
          testUtils.LICENSE_TOKEN_ID,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
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
          1: SLong(newWinnerTicketIndex),
        });

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail with duplicated winner ticket index',
      ({ boxFactory, creator, nextSeed }) => {
        const winnersCount = 5;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;
        const totalPrize = 1_000_000n;
        const prizeValue = totalPrize;
        // set invalid special value that make the sameSelectedWinners size
        // more than zero on the contract
        const newWinnerTicketIndex = 1n;

        const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          TEST_INITIAL_SEED,
          [newWinnerTicketIndex],
          5n,
          winnersCount,
          totalPrize,
          prizeValue,
          2,
        ) as ErgoUnsignedInput;

        successRaffleBox.setContextExtension({
          0: SColl(SLong, [newWinnerTicketIndex]),
          1: SLong(newWinnerTicketIndex),
        });

        const winnerBox = boxFactory.createWinnerSingleBoxMock(
          2,
          winnersCount,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          BigInt(2000),
          0n,
          testUtils.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          2,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex, newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          3,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail if wrong winner ticket index is set on winner prize box',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        winnerBox,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          // set invalid winner ticket index
          newWinnerTicketIndex + 1n,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail if input winner box belongs to another raffle',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const anotherRaffleTicketId = '0'.repeat(64);
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const winnerBox = boxFactory.createWinnerSingleBoxMock(
          1,
          winnersCount,
          // Set another raffle ticket-id
          anotherRaffleTicketId,
          undefined,
          BigInt(2000),
          0n,
          testUtils.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
          undefined,
          anotherRaffleTicketId,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if input winner box does not match with step on success raffle
     * @scenario
     * - create two output boxes
     * - execute transaction by winner box with invalid index
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if input winner box does not match with step on success raffle',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const winnerBox = boxFactory.createWinnerSingleBoxMock(
          2,
          winnersCount,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          BigInt(2000),
          0n,
          testUtils.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          2,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          // use invalid winner box
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail with wrong selected winner list in success raffle output box',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        winnerBox,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          // set invalid selectedWinnersList
          [newWinnerTicketIndex + 1n],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail with wrong seed in success raffle output box',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        winnerBox,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          // set invalid seed
          'invalid seed',
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail if in a erg-goal raffle funds are deducted more than required prize of the selected winner',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        winnerBox,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          // put 100 more nano-ergs to this box
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n + 100n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTokenGoalTest(
      'should fail if in a token-goal raffle funds are deducted more than required prize of the selected winner',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        winnerBox,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
          {
            tokenId: testUtils.X_TOKEN_ID,
            // put 1 more token to this box
            amount: (totalPrize * rewardPercent) / 1000n + 1n,
          },
        );
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleBox.value,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          successRaffleBox.assets[2].amount -
            (totalPrize * rewardPercent) / 1000n -
            1n,
          2,
          undefined,
          undefined,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([successRaffleBox, winnerBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

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
    successRaffleTest(
      'should fail if an arbitrary token is added to erg-goal success raffle',
      ({
        boxFactory,
        creator,
        newWinnerTicketIndex,
        nextSeed,
        someoneWallet,
        winnerBox,
        successRaffleBox,
      }) => {
        const winnersCount = 5;
        const totalPrize = 1_000_000n;
        const rewardPercent = 200n;
        const totalSoldTickets = 5n;

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          winnerBox.assets[1].amount,
        );
        const successRaffleOutputValue =
          BigInt(winnerBox.value) +
          successRaffleBox.value -
          prizeOutputBox.value -
          testUtils.FEE;
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          successRaffleOutputValue,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          [newWinnerTicketIndex],
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
              tokenId: testUtils.X_TOKEN_ID,
              amount: 1n,
            },
          ],
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, successRaffleBox, ...someoneWallet.utxos])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
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
    successRaffleTest(
      'should successfully return license token and pay the project fund for an erg-goal raffle',
      ({
        boxFactory,
        creator,
        serviceBox,
        successRaffleForLicenseRedeemBox,
      }) => {
        const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
          .data as bigint[];
        const serviceFeePercent = serviceR4[0];
        const implementerFeePercent = serviceR4[1];
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

        const creatorFund = boxFactory.createSafePayOutputBox(
          successRaffleForLicenseRedeemBox.value - testUtils.FEE,
          [],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, successRaffleForLicenseRedeemBox])
          .to([serviceOutputBox, creatorFund])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn ticket tokens
          .burnTokens(successRaffleForLicenseRedeemBox.assets[1])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should successfully return license token and pay the project fund for a token-goal raffle
     * @scenario
     * - create two output boxes
     * - execute transaction and burn current raffle related ticket tokens
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    successRaffleTokenGoalTest(
      'should successfully return license token and pay the project fund for a token-goal raffle',
      ({
        boxFactory,
        creator,
        serviceBox,
        successRaffleForLicenseRedeemBox,
      }) => {
        const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
          .data as bigint[];
        const serviceFeePercent = serviceR4[0];
        const implementerFeePercent = serviceR4[1];
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

        const creatorFund = boxFactory.createSafePayOutputBox(
          successRaffleForLicenseRedeemBox.value - testUtils.FEE,
          [successRaffleForLicenseRedeemBox.assets[2]],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, successRaffleForLicenseRedeemBox])
          .to([serviceOutputBox, creatorFund])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn ticket tokens
          .burnTokens(successRaffleForLicenseRedeemBox.assets[1])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should fail if service box has a different service nft
     * @scenario
     * - create successRaffle output box by invalid nft id
     * - create creatorFund output box
     * - execute transaction and burn current raffle related ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if service box has a different service nft',
      ({
        boxFactory,
        creator,
        someoneWallet,
        ownerWallet,
        successRaffleForLicenseRedeemBox,
      }) => {
        const serviceBox = boxFactory.createServiceBoxMock(
          ownerWallet.ergoTree,
          testUtils.LICENSE_TOKEN_COUNT,
          100n,
          100n,
          testUtils.CREATION_FEE,
          undefined,
          testUtils.X_TOKEN_ID,
        );

        const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
          .data as bigint[];
        const serviceFeePercent = serviceR4[0];
        const implementerFeePercent = serviceR4[1];
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
          undefined,
          // set invalid nft id
          testUtils.X_TOKEN_ID,
        );

        const creatorFund = boxFactory.createSafePayOutputBox(
          successRaffleForLicenseRedeemBox.value - testUtils.FEE,
          [],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, successRaffleForLicenseRedeemBox])
          .to([serviceOutputBox, creatorFund])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn ticket tokens
          .burnTokens(successRaffleForLicenseRedeemBox.assets[1])
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if project fund withdrawal is incorrect for an erg-goal raffle
     * @scenario
     * - create successRaffle output box
     * - create creatorFund output box by invalid value
     * - execute transaction and burn current raffle related ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if project fund withdrawal is incorrect for an erg-goal raffle',
      ({
        boxFactory,
        creator,
        serviceBox,
        successRaffleForLicenseRedeemBox,
      }) => {
        const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
          .data as bigint[];
        const serviceFeePercent = serviceR4[0];
        const implementerFeePercent = serviceR4[1];

        const serviceOutputBox = boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

        const creatorFund = boxFactory.createSafePayOutputBox(
          // invalid value: minus one extra fee value
          successRaffleForLicenseRedeemBox.value -
            testUtils.FEE -
            testUtils.FEE,
          [],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, successRaffleForLicenseRedeemBox])
          .to([serviceOutputBox, creatorFund])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn ticket tokens
          .burnTokens(successRaffleForLicenseRedeemBox.assets[1])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if project fund withdrawal is incorrect for a token-goal raffle
     * @scenario
     * - create successRaffle output box
     * - create creatorFund output box by invalid collecting token amount
     * - execute transaction and burn current raffle related ticket tokens and some of collecting token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTokenGoalTest(
      'should fail if project fund withdrawal is incorrect for a token-goal raffle',
      ({
        boxFactory,
        creator,
        serviceBox,
        successRaffleForLicenseRedeemBox,
      }) => {
        const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
          .data as bigint[];
        const serviceFeePercent = serviceR4[0];
        const implementerFeePercent = serviceR4[1];
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

        const creatorFund = boxFactory.createSafePayOutputBox(
          successRaffleForLicenseRedeemBox.value - testUtils.FEE,
          [
            {
              tokenId: successRaffleForLicenseRedeemBox.assets[2].tokenId,
              // invalid value: minus one extra collecting token
              amount:
                BigInt(successRaffleForLicenseRedeemBox.assets[2].amount) - 1n,
            },
          ],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, successRaffleForLicenseRedeemBox])
          .to([serviceOutputBox, creatorFund])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn ticket tokens
          .burnTokens([
            successRaffleForLicenseRedeemBox.assets[1],
            {
              tokenId: successRaffleForLicenseRedeemBox.assets[2].tokenId,
              amount: 1n,
            },
          ])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if a ticket token is stolen
     * @scenario
     * - create successRaffle output box
     * - create creatorFund output box by one stole ticket token
     * - execute transaction and burn current raffle related ticket tokens and some of collecting token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if a ticket token is stolen',
      ({
        boxFactory,
        creator,
        serviceBox,
        successRaffleForLicenseRedeemBox,
      }) => {
        const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
          .data as bigint[];
        const serviceFeePercent = serviceR4[0];
        const implementerFeePercent = serviceR4[1];

        const serviceOutputBox = boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

        const creatorFund = boxFactory.createSafePayOutputBox(
          successRaffleForLicenseRedeemBox.value - testUtils.FEE,
          [
            // stole one ticket token
            {
              tokenId: successRaffleForLicenseRedeemBox.assets[1].tokenId,
              amount: 1n,
            },
          ],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, successRaffleForLicenseRedeemBox])
          .to([serviceOutputBox, creatorFund])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn ticket tokens
          .burnTokens([
            {
              tokenId: successRaffleForLicenseRedeemBox.assets[1].tokenId,
              amount:
                BigInt(successRaffleForLicenseRedeemBox.assets[1].amount) - 1n,
            },
          ])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if a raffle license is stolen with spending two similar success raffles
     * @scenario
     * - create three output boxes
     * - execute transaction and burn current raffle related ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if a raffle license is stolen with spending two similar success raffles',
      ({
        boxFactory,
        creator,
        someoneWallet,
        serviceBox,
        successRaffleForLicenseRedeemBox,
      }) => {
        const serviceR4 = SConstant.from(serviceBox.additionalRegisters.R4!)
          .data as bigint[];
        const serviceFeePercent = serviceR4[0];
        const implementerFeePercent = serviceR4[1];

        const successRaffleForLicenseRedeemBox2 =
          boxFactory.createSuccessRaffleBoxMock(
            testUtils.FEE * 3n + testUtils.CREATION_FEE,
            testUtils.LICENSE_TOKEN_ID,
            blake2b256(Buffer.from(creator.ergoTree, 'hex')),
            TEST_INITIAL_SEED,
            [],
            5n,
            5,
            5n,
            50n,
            6,
            testUtils.X_TOKEN_ID,
          ) as ErgoUnsignedInput;

        const serviceOutputBox = boxFactory.createServiceOutputBox(
          serviceBox.ergoTree,
          serviceBox.assets[1].amount + 1n,
          serviceFeePercent,
          implementerFeePercent,
          serviceR4[2],
        );

        const creatorFund = boxFactory.createSafePayOutputBox(
          successRaffleForLicenseRedeemBox.value - testUtils.FEE,
          [],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([
            serviceBox,
            successRaffleForLicenseRedeemBox,
            successRaffleForLicenseRedeemBox2,
            ...someoneWallet.utxos,
          ])
          .to([serviceOutputBox, creatorFund])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn ticket tokens
          .burnTokens(successRaffleForLicenseRedeemBox.assets[1])
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
