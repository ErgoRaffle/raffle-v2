import { it, describe, expect } from 'vitest';
import { compile } from '@fleet-sdk/compiler';
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
    1n,
    compile('{sigmaProp(true);}').toHex().toString(),
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
     * @target Should transaction of spend giftTokenRepo box move to one Winner box successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create one winner output box
     * - execution transaction
     * @expected
     * - transaction result must done successfully
     */
    giftTokenRepoBy1WinnerTest(
      'Should transaction of spend one giftTokenRepo box move to one winner-box successful',
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
     * @target Should transaction of spend one giftTokenRepo box to latest box of five winner-boxes successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must done successfully
     */
    giftTokenRepoBy5WinnerTest(
      'Should transaction of spend one giftTokenRepo box to latest box of five winner-boxes successful',
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
     * @target Should transaction of spend one giftTokenRepo box to second box of five winner-boxes successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must done successfully
     */
    giftTokenRepoBy5WinnerTest(
      'Should transaction of spend one giftTokenRepo box to second box of five winner-boxes successful',
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
          1,
          10,
        );
        winnerOutputBoxes[0].addTokens({
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
          2,
        );
        const outBoxes = [winnerOutputBoxes[0], giftTokenOutputBox];

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
     * @target Should result of transaction be false when more than 1 gift-token move from winnerOutputBoxes to unknown box for steal
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create one extra box for stealing gift-token
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when more than 1 gift-token move from winnerOutputBoxes to unknown box for steal',
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
          5,
          testUtils.FEE * 5n + 15_000_000n,
          1,
          25,
        );
        winnerOutputBoxes[0].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 4n,
        });
        const extraOutputBox = new OutputBuilder(
          15_000_000n,
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
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should result of transaction be false when more than 1 gift-token move to one box of five winner-boxes
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add two gift-token to the winner box instead of one
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when more than 1 gift-token move to one box of five winner-boxes',
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
          60_000_000n,
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
     * @target Should result of transaction be false when more than 100 gift-token move to output giftTokenRepo box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - Add under estimated amount of gift-token to the winner box
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when more than 100 gift-token move to output giftTokenRepo box',
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
          1,
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
     * @target Should result of transaction be false when invalid register in output box
     * @scenario
     * - create giftTokenRepo input box
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid gift-token count in register
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when invalid register in output box',
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
          3,
          49,
        );
        winnerOutputBoxes[4].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const giftTokenOutputBox = testUtils.createGiftTokenRepoOutputBox(
          5,
          5,
          testUtils.TICKET_TOKEN_ID,
          'add',
          39n, // set invalid amount of giftTokenCount in register
          60_000_000n,
          40,
        );
        const outBoxes = [winnerOutputBoxes[4], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[4]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should result of transaction be false when invalid step number in output box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid step number
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when invalid step number in output box',
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
          4,
          testUtils.FEE * 1n,
          3,
          2,
        );
        winnerOutputBoxes[4].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 2n,
        });

        const outBoxes = [winnerOutputBoxes[4]];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[4]])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should result of transaction be false when over paying fee value
     * @scenario
     * - create giftTokenRepo input box
     * - create five winner output boxes
     * - create giftTokenRepo output box with invalid paying fee
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when over paying fee value',
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
          testUtils.FEE * 5n + testUtils.FEE, // set extra value for extra fee paying
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
          60_000_000n,
          2,
        );
        const outBoxes = [winnerOutputBoxes[0], giftTokenOutputBox];

        const transaction = new TransactionBuilder(chain.height)
          .from([giftTokenInputBox, (winnersInputBoxes as Box[])[0]])
          .to(outBoxes)
          .payFee(testUtils.FEE * 2n)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should result of transaction be false when winner output box index is invalid
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when winner output box index is invalid',
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
     * @target Should result of transaction be false when winner ticket token is invalid
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when winner ticket token is invalid',
      ({ chain, rosen, winnersInputBoxes }) => {
        const winnerOutputBoxes = testUtils.createWinnersOutputBox(
          5n,
          INACTIVE_RAFFLE_SAMPLE_ID,
          '1234'.repeat(16), // Use invalid Ticket-Token id
        );
        const extraInputBox = mockUTxO({
          ergoTree: rosen.ergoTree,
          value: 15_000_000n,
          creationHeight: 4,
          assets: [{ tokenId: '1234'.repeat(16), amount: 1n }],
        });
        const giftTokenInputBox = testUtils.createGiftTokenRepoBoxMock(
          5,
          testUtils.TICKET_TOKEN_ID,
          testUtils.GIFT_TOKEN_ID,
          10,
          testUtils.FEE * 1n,
          5,
          50,
        );
        winnerOutputBoxes[4].addTokens({
          tokenId: giftTokenInputBox.assets[0].tokenId,
          amount: 10n,
        });

        const outBoxes = [winnerOutputBoxes[4]];

        const transaction = new TransactionBuilder(chain.height)
          .from([
            giftTokenInputBox,
            (winnersInputBoxes as Box[])[4],
            extraInputBox,
          ])
          .to(outBoxes)
          .payFee(testUtils.FEE)
          .sendChangeTo(rosen.ergoTree)
          .build();

        expect(() => chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target Should result of transaction be false when deficiency in gift token be evident
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    giftTokenRepoBy5WinnerTest(
      'Should result of transaction be false when deficiency in gift token be evident',
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
          15_000_000n,
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
