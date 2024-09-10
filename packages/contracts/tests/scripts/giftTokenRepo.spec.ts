import { it, describe, expect } from 'vitest';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';
import * as constants from '../../constants';

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create Winners input boxes
 * @returns vitest customized "it" object
 */
const createGiftTokenRepoTest = (winnersCount: number = 1) => {
  const chain = new MockChain({ height: 1000 });
  const { creator } = testUtils.createPartners(chain, {
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
  });

  const winnersInputBoxes = testUtils.createWinnersBoxMock(
    BigInt(winnersCount),
    testUtils.TICKET_TOKEN_ID,
    undefined,
    BigInt(chain.height + 1000),
    0n,
    undefined,
    undefined,
    constants.TRUE_SCRIPT_HEX,
  );

  return it.extend({
    chain: chain,
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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(1n, 1);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(1);
        winnerOutputBox.addTokens({
          tokenId: testUtils.GIFT_TOKEN_ID,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const outBoxes = [winnerOutputBox];
        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        const res = chain.execute(transaction);

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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n, 5);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          5,
          testUtils.FEE * 1n,
          BigInt(testUtils.GIFT_TOKEN_COUNT),
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const outBoxes = [winnerOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[4], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        const res = chain.execute(transaction);

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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n, 2);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          2,
          testUtils.FEE * 4n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 4),
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5n,
          'add',
          3,
          testUtils.FEE * 3n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 3),
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();
        const res = chain.execute(transaction);

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
      ({ chain, creator, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n);
        const extraInput = mockUTxO({
          value: testUtils.FEE,
          ergoTree: creator.ergoTree,
        });
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT - 1),
        });
        const extraOutputBox = new OutputBuilder(
          testUtils.FEE,
          creator.ergoTree,
        ).addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 1n,
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5n,
          'add',
          2,
          testUtils.FEE * 4n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 4),
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox, extraOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([
            (winnersInputBoxes as Box[])[0],
            giftTokenInputBox,
            extraInput,
          ])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          // Move 1 more token to winner box
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT + 1),
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5n,
          'add',
          2,
          testUtils.FEE * 4n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 4 - 1),
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5n,
          'add',
          2,
          testUtils.FEE * 4n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 4),
          undefined,
          undefined,
          1000,
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          6n, // invalid winner count
          'add',
          2,
          testUtils.FEE * 4n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 4),
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n, 2);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5n,
          'add',
          1, // invalid step number
          testUtils.FEE * 4n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 4),
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(5);
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5n,
          'add',
          2,
          testUtils.FEE * 3n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 4),
        );
        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[0], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE * 2n) // Over paying fee value
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          4, // invalid winner index
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          4,
          testUtils.FEE,
          BigInt(testUtils.GIFT_TOKEN_COUNT),
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const outBoxes = [winnerOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[4], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, creator }) => {
        const anotherWinnersInputBoxes = testUtils.createWinnersBoxMock(
          5n,
          '1234'.repeat(16), // set different ticket token id
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          constants.TRUE_SCRIPT_HEX,
        );
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          5,
          testUtils.GIFT_TOKEN_ID,
          '1234'.repeat(16),
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          5,
          testUtils.FEE,
          BigInt(testUtils.GIFT_TOKEN_COUNT),
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT),
        });

        const outBoxes = [winnerOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(anotherWinnersInputBoxes as Box[])[4], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.ergoTree)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
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
      ({ chain, creator, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(5n, 4);
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          4,
          testUtils.FEE * 2n,
          BigInt(testUtils.GIFT_TOKEN_COUNT * 2),
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: BigInt(testUtils.GIFT_TOKEN_COUNT - 1),
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5n,
          'add',
          5,
          testUtils.FEE,
          BigInt(testUtils.GIFT_TOKEN_COUNT + 1),
        );

        const outBoxes = [winnerOutputBox, giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[3], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.ergoTree)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );
  });
});
