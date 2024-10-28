import { it, describe, expect } from 'vitest';
import { Box, ErgoUnsignedInput, TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { SColl, SLong } from '@fleet-sdk/serializer';

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
const createSuccessRaffleTest = (
  winnersCount: number = 5,
  collectingTokenId?: string,
) => {
  const totalPrize = 5n;
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'successRaffle',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);

  const { creator, someone } = boxFactory.createPartners({
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
    someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });
  someone.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });

  // Created input successRaffle-box
  const prizeValue = 10n * totalPrize;
  const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
    testUtils.FEE,
    testUtils.LICENSE_TOKEN_ID,
    TEST_INITIAL_SEED,
    [],
    5n,
    winnersCount,
    totalPrize,
    prizeValue,
    1,
    undefined,
    undefined,
    collectingTokenId,
  ) as ErgoUnsignedInput;

  const winnersBoxes = boxFactory.createWinnersBoxMock(
    Number(winnersCount),
    testUtils.TICKET_TOKEN_ID,
    undefined,
    2000n,
    0n,
    testUtils.GIFT_TOKEN_ID,
  );

  return it.extend({
    boxFactory: boxFactory,
    winnersCount: winnersCount,
    totalPrize: totalPrize,
    someoneWallet: someone,
    creator: creator,
    successRaffleBox: successRaffleBox,
    winnersBoxes: winnersBoxes as Box[],
  });
};

describe('successRaffle', () => {
  const successRaffleTest = createSuccessRaffleTest();
  const successRaffleTokenGoalTest = createSuccessRaffleTest(
    undefined,
    testUtils.X_TOKEN_ID,
  );

  describe('winner prize creation', () => {
    /**
     * @target should done winner prize creation transaction successfully
     * @scenario
     * - create two output boxes by values
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    successRaffleTest(
      'should done winner prize creation transaction successfully',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
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
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail with wrong calculated winner ticket index ',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
        const newWinnerTicketIndex = 0n;

        successRaffleBox.setContextExtension({
          0: SColl(SLong, [0n]),
          1: SLong(newWinnerTicketIndex),
        });

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          2,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail with duplicated winner ticket index
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail with duplicated winner ticket index',
      ({ boxFactory, winnersBoxes }) => {
        const winnersCount = 5;
        const rewardPercent = 5n;
        const totalSoldTickets = 5n;
        const totalPrize = 5n;
        const prizeValue = 10n * totalPrize;
        // set invalid special value that make the sameSelectedWinners size
        // more than zero on the contract
        const newWinnerTicketIndex = 1n;

        const successRaffleBox = boxFactory.createSuccessRaffleBoxMock(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          2,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[1].assets[0]],
        );
        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex, newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          3,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[1], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if wrong winner ticket index is set on winner prize box
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if wrong winner ticket index is set on winner prize box',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          // set invalid winner ticket index
          newWinnerTicketIndex + 1n,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if input winner box belongs to another raffle
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if input winner box belongs to another raffle',
      ({ boxFactory, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const anotherRaffleTicketId = '0'.repeat(64);
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
        const newWinnerTicketIndex = testUtils.generateNextWinnerIndex(
          [],
          1,
          Uint8Array.from(Array.from(Buffer.from(TEST_INITIAL_SEED, 'hex'))),
          totalSoldTickets,
        );

        const winnersBoxes = boxFactory.createWinnersBoxMock(
          Number(winnersCount),
          // Set another raffle ticket-id
          anotherRaffleTicketId,
          undefined,
          BigInt(2000),
          0n,
          testUtils.GIFT_TOKEN_ID,
        );

        successRaffleBox.setContextExtension({
          0: SColl(SLong, []),
          1: SLong(newWinnerTicketIndex),
        });

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if input winner box does not match with step on success raffle
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if input winner box does not match with step on success raffle',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          // use invalid winner box
          .from([(winnersBoxes as Box[])[1], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail with wrong selected winner list in success raffle output box
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail with wrong selected winner list in success raffle output box',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          // set invalid selectedWinnersList
          [newWinnerTicketIndex + 1n],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail with wrong seed in success raffle output box
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail with wrong seed in success raffle output box',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
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

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          // set invalid seed
          'invalid seed',
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if in a erg-goal raffle funds are deducted more than required prize of the selected winner
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if in a erg-goal raffle funds are deducted more than required prize of the selected winner',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          // put 100 more nano-ergs to this box
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n + 100n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE - 100n,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
          totalPrize,
          undefined,
          2,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if in a token-goal raffle funds are deducted more than required prize of the selected winner
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTokenGoalTest(
      'should fail if in a token-goal raffle funds are deducted more than required prize of the selected winner',
      ({ boxFactory, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 200n;
        const totalSoldTickets = totalPrize;
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [
            (winnersBoxes as Box[])[0].assets[0],
            {
              tokenId: testUtils.X_TOKEN_ID,
              // put 100 more nano-ergs to this box
              amount: (totalPrize * rewardPercent) / 1000n + 1n,
            },
          ],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
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
          .from([(winnersBoxes as Box[])[0], successRaffleBox])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if an arbitrary token is added to erg-goal success raffle
     * @scenario
     * - create three output boxes by values
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    successRaffleTest(
      'should fail if an arbitrary token is added to erg-goal success raffle',
      ({ boxFactory, someoneWallet, winnersBoxes, successRaffleBox }) => {
        const winnersCount = 5n;
        const totalPrize = 5n;
        const rewardPercent = 5n;
        const totalSoldTickets = totalPrize;
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

        const nextSeed = Buffer.from(blake2b256(TEST_INITIAL_SEED)).toString(
          'hex',
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 2n + (totalPrize * rewardPercent) / 1000n,
          1,
          newWinnerTicketIndex,
          1n,
          0n,
          [(winnersBoxes as Box[])[0].assets[0]],
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          nextSeed,
          [newWinnerTicketIndex],
          totalSoldTickets,
          Number(winnersCount),
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
          .from([
            (winnersBoxes as Box[])[0],
            successRaffleBox,
            ...someoneWallet.utxos,
          ])
          .to([successRaffleOutputBox, prizeOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
