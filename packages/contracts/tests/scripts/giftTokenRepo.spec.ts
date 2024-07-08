import { it, describe, expect } from 'vitest';
import { MockChain, mockUTxO } from '@fleet-sdk/mock-chain';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';

const INACTIVE_RAFFLE_SAMPLE_ID = '0'.repeat(64);

/*
 * create fixtures that contains below steps data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create Winners input boxes
 * @returns vitest customized "it" object
 */
function createGiftTokenRepoTest(winnersCount: number = 1) {
  const chain = new MockChain({ height: 1000 });
  const { creator, rosen } = testUtils.createPartners(chain, {
    Creator: testUtils.CREATOR_DEFAULT_BALANCE,
    Rosen: testUtils.ROSEN_DEFAULT_BALANCE,
  });

  const winnersInputBoxes = testUtils.createWinnersBoxMock(
    BigInt(winnersCount),
    INACTIVE_RAFFLE_SAMPLE_ID,
    testUtils.TICKET_TOKEN_ID,
  );

  return it.extend({
    chain: chain,
    rosen: rosen,
    creator: creator,
    winnersInputBoxes: winnersInputBoxes,
  });
}

describe('giftTokenRepo', () => {
  const giftTokenRepoBy1WinnerTest = createGiftTokenRepoTest();
  const giftTokenRepoBy5WinnerTest = createGiftTokenRepoTest(5);

  describe('giftTokenRepo box Spending transaction', () => {
    /**
     * @target Should the transaction of spending gift tokens from the repo box successfully move to one winner's box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create one winner output box
     * - execution transaction
     * @expected
     * - transaction result must done successfully
     */
    giftTokenRepoBy1WinnerTest(
      "Should the transaction of spending gift tokens from the repo box successfully move to one winner's box",
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          1n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[0].addTokens({
          tokenId: testUtils.GIFT_TOKEN_ID,
          amount: 2n,
        });

        const outBoxes = [winnerOutputBoxes[0]];
        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        const res = chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target Should the transaction of spending one gift token from the repo box to the latest box of five winner boxes be successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must done successfully
     */
    giftTokenRepoBy5WinnerTest(
      'Should the transaction of spending one gift token from the repo box to the latest box of five winner boxes be successful',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
          testUtils.TICKET_TOKEN_ID,
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
        winnerOutputBoxes[4].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const outBoxes = [winnerOutputBoxes[4]];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[4]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        const res = chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target Should the transaction of spending one gift token from the repo box to the second box of the five winner boxes be successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must done successfully
     */
    giftTokenRepoBy5WinnerTest(
      'Should the transaction of spending one gift token from the repo box to the second box of the five winner boxes be successful',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          1,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          2,
          testUtils.FEE * 5n,
          2,
          10,
        );
        winnerOutputBoxes[1].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 2n,
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5,
          1,
          testUtils.TICKET_TOKEN_ID,
          'add',
          8n,
          testUtils.FEE * 4n,
          3,
        );
        const outBoxes = [winnerOutputBoxes[1], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();
        const res = chain.execute(transaction);

        expect(res).true;
      },
    );

    /**
     * @target Should the result of the transaction be false when more than one gift token moves from the winner output boxes to an unknown box for stealing
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create one extra box for stealing gift-token
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when more than one gift token moves from the winner output boxes to an unknown box for stealing',
      ({ chain, rosen, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
          testUtils.TICKET_TOKEN_ID,
        );
        const extraInput = mockUTxO({
          value: testUtils.FEE,
          ergoTree: rosen.ergoTree,
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
        winnerOutputBoxes[0].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 4n,
        });
        const extraOutputBox = new OutputBuilder(
          testUtils.FEE,
          rosen.ergoTree,
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
        const outBoxes = [
          winnerOutputBoxes[0],
          giftTokenOutputBox,
          extraOutputBox,
        ];

        const transaction = new TransactionBuilder(chain.height)
          .from([
            giftTokenInputBox,
            (winnersInputBoxes as Box[])[0],
            extraInput,
          ])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when more than one gift token moves to one box of the five winner boxes
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add two gift-token to the winner box instead of one
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when more than one gift token moves to one box of the five winner boxes',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[0].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          // Move 3 token to the this box instead of 2
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
        const outBoxes = [winnerOutputBoxes[0], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when invalid amount of gift tokens set to register of the output gift token repository box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add under estimated amount of gift-token to the winner box
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when invalid amount of gift tokens set to register of the output gift token repository box',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[0].addTokens({
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
        const outBoxes = [winnerOutputBoxes[0], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when an invalid register is in the output box
     * @scenario
     * - create giftTokenRepo input box
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid gift-token count in register
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when an invalid register is in the output box',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[0].addTokens({
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
        const outBoxes = [winnerOutputBoxes[0], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when there is an invalid step number in the winner output box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid step number
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when there is an invalid step number in the winner output box',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[1].addTokens({
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
        const outBoxes = [winnerOutputBoxes[1], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when over paying fee value
     * @scenario
     * - create giftTokenRepo input box
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid paying fee
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when over paying fee value',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[0].addTokens({
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
        const outBoxes = [winnerOutputBoxes[0], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE * 2n) // Over paying fee value
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when invalid index in output winner box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when invalid index in output winner box',
      ({ chain, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[3].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const outBoxes = [
          winnerOutputBoxes[3], // use winner box by invalid index
        ];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[4]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when invalid ticket token in winner box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when invalid ticket token in winner box',
      ({ chain, rosen }) => {
        const anotherWinnersInputBoxes = testUtils.createWinnersBoxMock(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
          '1234'.repeat(16),
        );
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[4].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const outBoxes = [winnerOutputBoxes[4]];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (anotherWinnersInputBoxes as Box[])[4]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .sendChangeTo(rosen.ergoTree)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should the result of the transaction be false when decrease less than gift token count on the output winner box and stay on the output gift token repo
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should the result of the transaction be false when decrease less than gift token count on the output winner box and stay on the output gift token repo',
      ({ chain, rosen, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
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
        winnerOutputBoxes[3].addTokens({
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

        const outBoxes = [winnerOutputBoxes[3], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[3]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .sendChangeTo(rosen.ergoTree)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );
  });
});
