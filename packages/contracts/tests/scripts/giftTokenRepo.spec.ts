import { it, describe, expect } from 'vitest';
import { mockUTxO } from '@fleet-sdk/mock-chain';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

import * as constants from '../../constants';
import * as testUtils from '../testUtils';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create Winners input boxes
 * @returns vitest customized "it" object
 */
const createGiftTokenRepoTest = (winnersCount: number = 1) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'giftTokenRepo',
    ) as ScriptNamesType[],
  );
  const { creator } = boxFactory.createPartners({
    Creator: testUtils.TestConstants.CREATOR_DEFAULT_BALANCE,
  });

  const winnersInputBoxes = boxFactory.createWinnersBoxMock(
    winnersCount,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    undefined,
    BigInt(boxFactory.chain.height + 1000),
    0n,
    testUtils.TestConstants.GIFT_TOKEN_ID,
    undefined,
  );

  return it.extend({
    boxFactory: boxFactory,
    creator: creator,
    winnersInputBoxes: winnersInputBoxes,
  });
};

describe('giftTokenRepo', () => {
  const giftTokenRepoBy1WinnerTest = createGiftTokenRepoTest();
  const giftTokenRepoBy5WinnerTest = createGiftTokenRepoTest(5);

  describe('giftTokenRepo box Spending transaction', () => {
    /**
     * @target should the transaction of spending gift tokens from the repo box successfully move to one winner's box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create one winner output box
     * - execution transaction
     * @expected
     * - transaction result must have done successfully
     */
    giftTokenRepoBy1WinnerTest(
      "should the transaction of spending gift tokens from the repo box successfully move to one winner's box",
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox();
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(1);
        winnerOutputBox.addTokens({
          tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const outBoxes = [winnerOutputBox];
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should the transaction of spending one gift token from the repo box to the latest box of five winner boxes be successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must have done successfully
     */
    giftTokenRepoBy5WinnerTest(
      'should the transaction of spending one gift token from the repo box to the latest box of five winner boxes be successful',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5, 5);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(
          5,
          5,
          testUtils.TestConstants.FEE * 1n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const outBoxes = [winnerOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[4], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should the transaction of spending one gift token from the repo box to the second box of the five winner boxes be successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must have done successfully
     */
    giftTokenRepoBy5WinnerTest(
      'should the transaction of spending one gift token from the repo box to the second box of the five winner boxes be successful',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5, 2);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(
          5,
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          3,
          testUtils.TestConstants.FEE * 3n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 3n,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();
        const res = boxFactory.chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target should fail when winner receives one less gift token (one token stole to an unknown box)
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create one extra box for stealing gift-token
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should fail when winner receives one less gift token (one token stole to an unknown box)',
      ({ boxFactory, creator, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5);
        const extraInput = mockUTxO({
          value: testUtils.TestConstants.FEE,
          ergoTree: creator.ergoTree,
        });
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT - 1n,
        });
        const extraOutputBox = new OutputBuilder(
          testUtils.TestConstants.FEE,
          creator.ergoTree,
        ).addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 1n,
        });
        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox, extraOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([
            (winnersInputBoxes as Box[])[0],
            giftTokenInputBox,
            extraInput,
          ])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail when winner box receives one more gift token (steal one extra token from giftTokenRepo)
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add two gift-token to the winner box instead of one
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should fail when winner box receives one more gift token (steal one extra token from giftTokenRepo)',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          // Move 1 more token to winner box
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT + 1n,
        });
        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n - 1n,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail when gift token count (register value) changes in giftTokenRepo output box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add underestimated amount of gift-token to the winner box
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should fail when gift token count (register value) changes in giftTokenRepo output box',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });
        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
          undefined,
          undefined,
          1000n,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail when winner count (register value) changes in giftTokenRepo output box
     * @scenario
     * - create giftTokenRepo input box
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid gift-token count in register
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should fail when winner count (register value) changes in giftTokenRepo output box',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          6, // invalid winner count
          'add',
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail with invalid step number in giftTokenRepo output box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid step number
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should fail with invalid step number in giftTokenRepo output box',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5, 2);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          1, // invalid step number
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should the result of the transaction be false when over paying fee value
     * @scenario
     * - create giftTokenRepo input box
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid paying fee
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when over paying fee value',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          2,
          testUtils.TestConstants.FEE * 3n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE * 2n) // Over paying fee value
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should the result of the transaction be false when invalid index in output winner box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when invalid index in output winner box',
      ({ boxFactory, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(
          5,
          4, // invalid winner index
        );
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(
          5,
          4,
          testUtils.TestConstants.FEE,
          testUtils.TestConstants.GIFT_TOKEN_COUNT,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const outBoxes = [winnerOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[4], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail when gift token is sent to another valid raffle winner box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should fail when gift token is sent to another valid raffle winner box',
      ({ boxFactory, creator }) => {
        const anotherWinnersInputBoxes = boxFactory.createWinnersBoxMock(
          5,
          '1234'.repeat(16), // set different ticket token id
        );
        const winnerOutputBox = boxFactory.createWinnerOutputBox(
          5,
          5,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          '1234'.repeat(16),
        );
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(
          5,
          5,
          testUtils.TestConstants.FEE,
          testUtils.TestConstants.GIFT_TOKEN_COUNT,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
        });

        const outBoxes = [winnerOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(anotherWinnersInputBoxes as Box[])[4], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .sendChangeTo(creator.ergoTree)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail when less than gift token count moves from giftTokenRepo to the winner box (excess token remains in giftTokenRepo)
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should fail when less than gift token count moves from giftTokenRepo to the winner box (excess token remains in giftTokenRepo)',
      ({ boxFactory, creator, winnersInputBoxes }) => {
        const winnerOutputBox = boxFactory.createWinnerOutputBox(5, 4);
        const giftTokenInputBox = boxFactory.createGiftTokenRepoBoxMock(
          5,
          4,
          testUtils.TestConstants.FEE * 2n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 2n,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: testUtils.TestConstants.GIFT_TOKEN_COUNT - 1n,
        });
        const giftTokenOutputBox = boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          5,
          testUtils.TestConstants.FEE,
          testUtils.TestConstants.GIFT_TOKEN_COUNT + 1n,
        );

        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([(winnersInputBoxes as Box[])[3], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.TestConstants.FEE)
          .sendChangeTo(creator.ergoTree)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
