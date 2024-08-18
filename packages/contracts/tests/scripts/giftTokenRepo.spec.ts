import { it, describe, expect } from 'vitest';
import { compile } from '@fleet-sdk/compiler';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';

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
    testUtils.GIFT_TOKEN_ID,
    testUtils.TICKET_TOKEN_ID,
    undefined,
    BigInt(chain.height + 1000),
    0n,
    compile('{sigmaProp(true);}').toHex().toString(),
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
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          1n,
          1,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          2,
          testUtils.FEE * BigInt(1),
          1,
          2,
        );
        winnerOutputBox.addTokens({
          tokenId: testUtils.GIFT_TOKEN_ID,
          amount: 2n,
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
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          5,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          10,
          testUtils.FEE * 1n,
          5,
          10,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
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
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          2,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          2,
          testUtils.FEE * 5n,
          2,
          10,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 2n,
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          2,
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          8n,
          testUtils.FEE * 4n,
          3,
          testUtils.GIFT_TOKEN_ID,
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
     * @target should the result of the transaction be false when more than one gift token moves from the winner output boxes to an unknown box for stealing
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create one extra box for stealing gift-token
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when more than one gift token moves from the winner output boxes to an unknown box for stealing',
      ({ chain, creator, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          1,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const extraInput = mockUTxO({
          value: testUtils.FEE,
          ergoTree: creator.ergoTree,
        });
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          5,
          testUtils.FEE * 5n,
          1,
          25,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 4n,
        });
        const extraOutputBox = new OutputBuilder(
          testUtils.FEE,
          creator.ergoTree,
        ).addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 1n,
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5,
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          20n,
          testUtils.FEE * 4n,
          2,
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
     * @target should the result of the transaction be false when more than one gift token moves to one box of the five winner boxes
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add two gift-token to the winner box instead of one
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when more than one gift token moves to one box of the five winner boxes',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          1,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          2,
          testUtils.FEE * 5n,
          1,
          10,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          // Move 3 token to this box instead of 2
          amount: 3n,
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          10,
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          7n,
          testUtils.FEE * 4n,
          2,
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
     * @target should the result of the transaction be false when invalid amount of gift tokens set to register of the output gift token repository box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add underestimated amount of gift-token to the winner box
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when invalid amount of gift tokens set to register of the output gift token repository box',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          1,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          100,
          testUtils.FEE * 5n,
          1,
          500,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 100n,
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          200, // Invalid amount of gift-token amount sets
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          400n,
          testUtils.FEE * 4n,
          2,
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
     * @target should the result of the transaction be false when an invalid register is in the output box
     * @scenario
     * - create giftTokenRepo input box
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid gift-token count in register
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when an invalid register is in the output box',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          1,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          10,
          testUtils.FEE * 5n,
          1,
          50,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          10,
          20, // set invalid amount of winnersCount in register
          testUtils.TICKET_TOKEN_ID,
          'add',
          40n,
          testUtils.FEE * 4n,
          2,
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
     * @target should the result of the transaction be false when there is an invalid step number in the giftTokenRepo output box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid step number
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when there is an invalid step number in the giftTokenRepo output box',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          2,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          2,
          testUtils.FEE * 5n,
          2,
          10,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 2n,
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          2,
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          8n,
          testUtils.FEE * 4n,
          5, // set invalid step
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
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          1,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          10,
          undefined,
          1,
          50,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          1,
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          40n,
          testUtils.FEE * 3n,
          2,
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
          4,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          2,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          10,
          testUtils.FEE * 1n,
          5,
          10,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const outBoxes = [
          winnerOutputBox, // use winner box by invalid index
        ];

        const transaction = new TransactionBuilder(chain.height)
          .from([(winnersInputBoxes as Box[])[4], giftTokenInputBox])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should the result of the transaction be false when invalid ticket token in winner box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when invalid ticket token in winner box',
      ({ chain, creator }) => {
        const anotherWinnersInputBoxes = testUtils.createWinnersBoxMock(
          5n,
          testUtils.GIFT_TOKEN_ID,
          '1234'.repeat(16),
        );
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          5,
          testUtils.GIFT_TOKEN_ID,
          '1234'.repeat(16),
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          10,
          testUtils.FEE * 1n,
          5,
          10,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
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
     * @target should the result of the transaction be false when decrease less than gift token count on the output winner box and stay on the output gift token repo
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'should the result of the transaction be false when decrease less than gift token count on the output winner box and stay on the output gift token repo',
      ({ chain, creator, winnersInputBoxes }) => {
        const winnerOutputBox = testUtils.createWinnerOutputBox(
          5n,
          4,
          testUtils.GIFT_TOKEN_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          2,
          testUtils.FEE * 2n,
          4,
          10,
        );
        winnerOutputBox.addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 1n,
        });
        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5,
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          9n,
          testUtils.FEE,
          2,
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
