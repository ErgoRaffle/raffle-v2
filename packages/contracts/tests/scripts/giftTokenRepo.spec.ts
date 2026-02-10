import {
  Box,
  TransactionBuilder,
  OutputBuilder,
  ErgoUnsignedInput,
} from '@fleet-sdk/core';
import { KeyedMockChainParty, mockUTxO } from '@fleet-sdk/mock-chain';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

interface GiftTokenRepoTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  creator: KeyedMockChainParty;
  winnersInputBoxes: ErgoUnsignedInput[];
}

interface TestInterface {
  giftTokenRepoBy1WinnerTestRequirements: GiftTokenRepoTestInterface;
  giftTokenRepoBy5WinnerTestRequirements: GiftTokenRepoTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create Winners input boxes
 * @returns object
 */
const provideGiftTokenRepoTestRequirements = (winnersCount: number = 1) => {
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

  return {
    boxFactory: boxFactory,
    creator: creator,
    winnersInputBoxes: winnersInputBoxes,
  };
};

describe('giftTokenRepo', () => {
  beforeEach<TestInterface>(async (ctx) => {
    ctx.giftTokenRepoBy1WinnerTestRequirements =
      provideGiftTokenRepoTestRequirements();
    ctx.giftTokenRepoBy5WinnerTestRequirements =
      provideGiftTokenRepoTestRequirements(5);
  });

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
    it<TestInterface>("should the transaction of spending gift tokens from the repo box successfully move to one winner's box", ({
      giftTokenRepoBy1WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy1WinnerTestRequirements.boxFactory.createWinnerOutputBox();
      const giftTokenInputBox =
        giftTokenRepoBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          1,
        );
      winnerOutputBox.addTokens({
        tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
      });

      const outBoxes = [winnerOutputBox];
      const transaction = new TransactionBuilder(
        giftTokenRepoBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy1WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        giftTokenRepoBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        );

      expect(res).toBeTruthy();
    });

    /**
     * @target should the transaction of spending one gift token from the repo box to the latest box of five winner boxes be successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must have done successfully
     */
    it<TestInterface>('should the transaction of spending one gift token from the repo box to the latest box of five winner boxes be successful', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
          5,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
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

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[4],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        );

      expect(res).toBeTruthy();
    });

    /**
     * @target should the transaction of spending one gift token from the repo box to the second box of the five winner boxes be successful
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - execution transaction
     * @expected
     * - transaction result must have done successfully
     */
    it<TestInterface>('should the transaction of spending one gift token from the repo box to the second box of the five winner boxes be successful', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
          2,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
      });

      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          3,
          testUtils.TestConstants.FEE * 3n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 3n,
        );
      const outBoxes = [winnerOutputBox, giftTokenOutputBox];

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();
      const res =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        );

      expect(res).toBeTruthy();
    });

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
    it<TestInterface>('should fail when winner receives one less gift token (one token stole to an unknown box)', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
        );
      const extraInput = mockUTxO({
        value: testUtils.TestConstants.FEE,
        ergoTree: giftTokenRepoBy5WinnerTestRequirements.creator.ergoTree,
      });
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT - 1n,
      });
      const extraOutputBox = new OutputBuilder(
        testUtils.TestConstants.FEE,
        giftTokenRepoBy5WinnerTestRequirements.creator.ergoTree,
      ).addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: 1n,
      });
      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
      const outBoxes = [winnerOutputBox, giftTokenOutputBox, extraOutputBox];

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
          extraInput,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

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
    it<TestInterface>('should fail when winner box receives one more gift token (steal one extra token from giftTokenRepo)', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        // Move 1 more token to winner box
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT + 1n,
      });
      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n - 1n,
        );
      const outBoxes = [winnerOutputBox, giftTokenOutputBox];

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

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
    it<TestInterface>('should fail when gift token count (register value) changes in giftTokenRepo output box', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
      });
      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
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

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

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
    it<TestInterface>('should fail when winner count (register value) changes in giftTokenRepo output box', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
      });

      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          6, // invalid winner count
          'add',
          2,
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
      const outBoxes = [winnerOutputBox, giftTokenOutputBox];

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

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
    it<TestInterface>('should fail with invalid step number in giftTokenRepo output box', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
          2,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
      });

      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          1, // invalid step number
          testUtils.TestConstants.FEE * 4n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
      const outBoxes = [winnerOutputBox, giftTokenOutputBox];

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

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
    it<TestInterface>('should the result of the transaction be false when over paying fee value', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT,
      });

      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          2,
          testUtils.TestConstants.FEE * 3n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 4n,
        );
      const outBoxes = [winnerOutputBox, giftTokenOutputBox];

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[0],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE * 2n) // Over paying fee value
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

    /**
     * @target should the result of the transaction be false when invalid index in output winner box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should the result of the transaction be false when invalid index in output winner box', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
          4, // invalid winner index
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
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

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[4],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

    /**
     * @target should fail when gift token is sent to another valid raffle winner box
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when gift token is sent to another valid raffle winner box', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const anotherWinnersInputBoxes =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnersBoxMock(
          5,
          '1234'.repeat(16), // set different ticket token id
        );
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
          5,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          '1234'.repeat(16),
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
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

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([(anotherWinnersInputBoxes as Box[])[4], giftTokenInputBox])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(giftTokenRepoBy5WinnerTestRequirements.creator.ergoTree)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

    /**
     * @target should fail when less than gift token count moves from giftTokenRepo to the winner box (excess token remains in giftTokenRepo)
     * @scenario
     * - create giftTokenRepo input and output boxes
     * - create five winner output boxes
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when less than gift token count moves from giftTokenRepo to the winner box (excess token remains in giftTokenRepo)', ({
      giftTokenRepoBy5WinnerTestRequirements,
    }) => {
      const winnerOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createWinnerOutputBox(
          5,
          4,
        );
      const giftTokenInputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoBoxMock(
          5,
          4,
          testUtils.TestConstants.FEE * 2n,
          testUtils.TestConstants.GIFT_TOKEN_COUNT * 2n,
        );
      winnerOutputBox.addTokens({
        tokenId: giftTokenInputBox.assets[0].tokenId,
        amount: testUtils.TestConstants.GIFT_TOKEN_COUNT - 1n,
      });
      const giftTokenOutputBox =
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
          'add',
          5,
          testUtils.TestConstants.FEE,
          testUtils.TestConstants.GIFT_TOKEN_COUNT + 1n,
        );

      const outBoxes = [winnerOutputBox, giftTokenOutputBox];

      const transaction = new TransactionBuilder(
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          (
            giftTokenRepoBy5WinnerTestRequirements.winnersInputBoxes as Box[]
          )[3],
          giftTokenInputBox,
        ])
        .to(outBoxes)
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(giftTokenRepoBy5WinnerTestRequirements.creator.ergoTree)
        .build();

      expect(() =>
        giftTokenRepoBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });
  });
});
