import { it, describe, expect } from 'vitest';
import { SByte, SColl, SConstant } from '@fleet-sdk/serializer';
import { TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import * as testUtils from '../testUtils';
import {
  X_TOKEN_ID,
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';
import { mockUTxO } from '@fleet-sdk/mock-chain';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create winnerPrize input box
 * @returns vitest customized "it" object
 */
const createWinnerPrizeTest = () => {
  const totalPrize = 20_000_000n;
  const winnerRewardPercent = 200n;
  const winnerTicketIndex = 1n;
  const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
  const winnerGiftTokensAmount = 1n;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'winnerPrize',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { creator, someone, unknown } = boxFactory.createPartners({
    creator: CREATOR_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
    unknown: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({ tokens: [{ tokenId: X_TOKEN_ID, amount: 100n }] });

  // create winnerPrize input box
  const winnerPrizeBox = boxFactory.createWinnerPrizeBoxMock(
    testUtils.FEE * 3n + BigInt(prizeAmount),
    1,
    winnerTicketIndex,
    1n,
    0n,
    winnerGiftTokensAmount,
  );

  // create gift input box
  const giftBox = boxFactory.createGiftBoxMock(
    1,
    blake2b256(Buffer.from(someone.ergoTree, 'hex')),
    testUtils.FEE * 10n,
    testUtils.GIFT_TOKEN_ID,
    1n,
  );

  // create ticket box
  const ticketBox = boxFactory.createTicketBoxMock(
    someone.ergoTree,
    5n,
    testUtils.TICKET_TOKEN_ID,
    [0n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
  );

  // create winnerPrize input box for final prize transaction
  const winnerPrizeBoxForFinalPrize = boxFactory.createWinnerPrizeBoxMock(
    testUtils.FEE * 3n + BigInt(prizeAmount),
    1,
    winnerTicketIndex,
    1n,
    1n,
    winnerGiftTokensAmount,
  );
  winnerPrizeBoxForFinalPrize.setContextExtension({
    0: SColl(SByte, Array.from(Buffer.from(someone.ergoTree, 'hex'))),
  });

  // create final prize box
  const finalPrizeBox = boxFactory.createSafePayOutputBox(
    BigInt(winnerPrizeBoxForFinalPrize.value.toString()) - testUtils.FEE,
    [],
    SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
  );

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    unknownWallet: unknown,
    ticketBox: ticketBox,
    winnerPrizeBox: winnerPrizeBox,
    giftBox: giftBox,
    winnerPrizeBoxForFinalPrize: winnerPrizeBoxForFinalPrize,
    finalPrizeBox: finalPrizeBox,
  });
};

describe('winnerPrize', () => {
  const winnerPrizeTest = createWinnerPrizeTest();

  describe('Gift unwrap', () => {
    /**
     * @target should successfully unwrap the gift for the winner ticket
     * @scenario
     * - create winnerPrize output box
     * - create unwrappedGift output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    winnerPrizeTest(
      'should successfully unwrap the gift for the winner ticket',
      ({ boxFactory, ticketBox, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );

    /**
     * @target should fail if ticket box belongs to another raffle
     * @scenario
     * - create ticketBox by different ticket token
     * - create winnerPrize output box
     * - create unwrappedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if ticket box belongs to another raffle',
      ({ boxFactory, someoneWallet, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const ticketBox = boxFactory.createTicketBoxMock(
          someoneWallet.ergoTree,
          5n,
          // set invalid ticket token id
          testUtils.X_TOKEN_ID,
          [0n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if ticket box range does not contain the winner ticket index
     * @scenario
     * - create ticketBox by different tickets range
     * - create winnerPrize output box
     * - create unwrappedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if ticket box range does not contain the winner ticket index',
      ({ boxFactory, someoneWallet, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const ticketBox = boxFactory.createTicketBoxMock(
          someoneWallet.ergoTree,
          3n,
          testUtils.TICKET_TOKEN_ID,
          // set invalid winner range
          [2n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if the gift belongs to another winner
     * @scenario
     * - create gift box by different gift-token
     * - create winnerPrize output box
     * - create unwrappedGift output box
     * - create an input box with extra gift-token
     * - create an output box with extra gift-token
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if the gift belongs to another winner',
      ({ boxFactory, someoneWallet, ticketBox, winnerPrizeBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const giftBox = boxFactory.createGiftBoxMock(
          // set different winnerIndex
          2,
          blake2b256(Buffer.from(someoneWallet.ergoTree, 'hex')),
          testUtils.FEE * 10n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if gift belongs to another raffle with the same winner index
     * @scenario
     * - create gift box by different gift-token
     * - create winnerPrize output box
     * - create unwrappedGift output box
     * - create an input box with extra gift-token
     * - create an output box with extra gift-token
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if gift belongs to another raffle with the same winner index',
      ({ boxFactory, someoneWallet, ticketBox, winnerPrizeBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const extraGiftTokenInput = mockUTxO({
          value: testUtils.FEE,
          ergoTree: constants.TRUE_SCRIPT_HEX,
          assets: [
            {
              tokenId: testUtils.GIFT_TOKEN_ID,
              amount: 1n,
            },
          ],
        });

        const giftBox = boxFactory.createGiftBoxMock(
          1,
          blake2b256(Buffer.from(someoneWallet.ergoTree, 'hex')),
          testUtils.FEE * 10n,
          // set giftTokenId
          testUtils.X_TOKEN_ID,
          1n,
        );

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()),
          [
            ...giftBox.assets.slice(1),
            {
              tokenId: X_TOKEN_ID,
              amount: 1n,
            },
          ],
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox, extraGiftTokenInput])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if gift token is not collected by the winner prize box
     * @scenario
     * - create winnerPrize output box with lowest amount of required gift-token
     * - create unwrappedGift output box
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if gift token is not collected by the winner prize box',
      ({ boxFactory, ticketBox, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount - 1n,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens({ tokenId: testUtils.GIFT_TOKEN_ID, amount: 1n })
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if gift token is not collected by the winner prize box
     * @scenario
     * - create winnerPrize output box by decreased amount of gift token
     * - create redeemedGift output box that contains one stolen gift token
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if gift token is not collected by the winner prize box',
      ({ boxFactory, ticketBox, giftBox, winnerPrizeBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          // set invalid amount of giftToken
          winnerGiftTokensAmount - 1n,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens({ tokenId: testUtils.GIFT_TOKEN_ID, amount: 1n })
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if unwrapped gift count is not updated correctly
     * @scenario
     * - create winnerPrize output box by incorrect unwrapped value
     * - create unwrappedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if unwrapped gift count is not updated correctly',
      ({ boxFactory, ticketBox, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          // put invalid amount of unwrapped gift value
          2n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if winner index is altered in winner prize output box
     * @scenario
     * - create winnerPrize output box by incorrect winner index
     * - create unwrappedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if winner index is altered in winner prize output box',
      ({ boxFactory, ticketBox, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          // put invalid winner index
          2,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if gift count is altered in winner prize output box
     * @scenario
     * - create winnerPrize output box by invalid amount of gift count
     * - create unwrappedGift output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if gift count is altered in winner prize output box',
      ({ boxFactory, ticketBox, winnerPrizeBox, giftBox }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          // set invalid amount of gift count
          3n,
          1n,
          winnerGiftTokensAmount,
        );

        const redeemedGift = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBox, giftBox])
          .to([winnerPrizeOutputBox, redeemedGift])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });

  describe('Winner Reward', () => {
    /**
     * @target should successfully create the final prize for the winner ticket(erg-goal)
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    winnerPrizeTest(
      'should successfully create the final prize for the winner ticket(erg-goal)',
      ({
        boxFactory,
        finalPrizeBox,
        ticketBox,
        winnerPrizeBoxForFinalPrize,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens(winnerPrizeBoxForFinalPrize.assets.slice(0, 2))
          .build();

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );

    /**
     * @target should successfully create the final prize for the winner ticket(token-goal)
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    winnerPrizeTest(
      'should successfully create the final prize for the winner ticket(token-goal)',
      ({ boxFactory, ticketBox, someoneWallet }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeBoxForFinalPrize = boxFactory.createWinnerPrizeBoxMock(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
          {
            tokenId: X_TOKEN_ID,
            amount: 100n,
          },
        );
        winnerPrizeBoxForFinalPrize.setContextExtension({
          0: SColl(
            SByte,
            Array.from(Buffer.from(someoneWallet.ergoTree, 'hex')),
          ),
        });

        // create final prize box
        const finalPrizeBox = boxFactory.createSafePayOutputBox(
          BigInt(winnerPrizeBoxForFinalPrize.value.toString()) - testUtils.FEE,
          [
            {
              tokenId: X_TOKEN_ID,
              // set incorrect amount of collecting token
              amount: 100n,
            },
          ],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens(winnerPrizeBoxForFinalPrize.assets.slice(0, 2))
          .build();

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );

    /**
     * @target should fail if ticket box belongs to another raffle
     * @scenario
     * - create ticket box by different token id
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if ticket box belongs to another raffle',
      ({
        boxFactory,
        someoneWallet,
        finalPrizeBox,
        winnerPrizeBoxForFinalPrize,
      }) => {
        const ticketBox = boxFactory.createTicketBoxMock(
          someoneWallet.ergoTree,
          5n,
          // set different ticket id
          testUtils.X_TOKEN_ID,
          [0n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens(winnerPrizeBoxForFinalPrize.assets.slice(0, 2))
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if ticket box range does not contain the winner ticket index
     * @scenario
     * - create ticket box by different ticket range
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if ticket box range does not contain the winner ticket index',
      ({
        boxFactory,
        someoneWallet,
        finalPrizeBox,
        winnerPrizeBoxForFinalPrize,
      }) => {
        const ticketBox = boxFactory.createTicketBoxMock(
          someoneWallet.ergoTree,
          5n,
          testUtils.TICKET_TOKEN_ID,
          // set different ticket range
          [5n, 10n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens(winnerPrizeBoxForFinalPrize.assets.slice(0, 2))
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if winner prize's ticket token is stolen
     * @scenario
     * - create finalPrize output box and put ticket token to this box
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      "should fail if winner prize's ticket token is stolen",
      ({ boxFactory, ticketBox, winnerPrizeBoxForFinalPrize }) => {
        const finalPrizeBox = boxFactory.createSafePayOutputBox(
          BigInt(winnerPrizeBoxForFinalPrize.value.toString()) - testUtils.FEE,
          // Insert the ticket token into this box to steal
          [{ tokenId: testUtils.TICKET_TOKEN_ID, amount: 1n }],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          // prevent the ticket token from burning
          .burnTokens(winnerPrizeBoxForFinalPrize.assets.slice(1, 2))
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if one gift token is stolen from winner prize
     * @scenario
     * - create finalPrize output box and put gift token to this box
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      'should fail if one gift token is stolen from winner prize',
      ({ boxFactory, ticketBox, winnerPrizeBoxForFinalPrize }) => {
        const finalPrizeBox = boxFactory.createSafePayOutputBox(
          BigInt(winnerPrizeBoxForFinalPrize.value.toString()) - testUtils.FEE,
          // Insert the gift token into this box to steal
          [{ tokenId: testUtils.GIFT_TOKEN_ID, amount: 1n }],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          // prevent the gift token from burning
          .burnTokens(winnerPrizeBoxForFinalPrize.assets.slice(0, 1))
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if final prize doesn't contain all collecting tokens
     * @scenario
     * - create winnerPrize box by collecting token
     * - create finalPrizeBox box by incorrect amount of collecting token
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    winnerPrizeTest(
      "should fail if final prize doesn't contain all collecting tokens",
      ({ boxFactory, ticketBox, someoneWallet }) => {
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const winnerTicketIndex = 1n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;
        const winnerGiftTokensAmount = 2n;

        const winnerPrizeBoxForFinalPrize = boxFactory.createWinnerPrizeBoxMock(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          1,
          winnerTicketIndex,
          1n,
          1n,
          winnerGiftTokensAmount,
          {
            tokenId: X_TOKEN_ID,
            amount: 100n,
          },
        );

        // create final prize box
        const finalPrizeBox = boxFactory.createSafePayOutputBox(
          BigInt(winnerPrizeBoxForFinalPrize.value.toString()) - testUtils.FEE,
          [
            {
              tokenId: X_TOKEN_ID,
              // set incorrect amount of collecting token
              amount: 99n,
            },
          ],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );
        winnerPrizeBoxForFinalPrize.setContextExtension({
          0: SColl(
            SByte,
            Array.from(Buffer.from(someoneWallet.ergoTree, 'hex')),
          ),
        });

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens([
            ...winnerPrizeBoxForFinalPrize.assets.slice(0, 2),
            {
              tokenId: X_TOKEN_ID,
              amount: 1n,
            },
          ])
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if final prize safe pay address hash differs from the winner ticket address hash
     * @scenario
     * - create finalPrizeBox by different destination address
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    winnerPrizeTest(
      'should fail if final prize safe pay address hash differs from the winner ticket address hash',
      ({
        boxFactory,
        unknownWallet,
        ticketBox,
        winnerPrizeBoxForFinalPrize,
      }) => {
        // create final prize box with different destination address
        const finalPrizeBox = boxFactory.createSafePayOutputBox(
          BigInt(winnerPrizeBoxForFinalPrize.value.toString()) - testUtils.FEE,
          [],
          blake2b256(unknownWallet.ergoTree),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerPrizeBoxForFinalPrize])
          .to([finalPrizeBox])
          .payFee(testUtils.FEE)
          .withDataFrom([ticketBox])
          .burnTokens(winnerPrizeBoxForFinalPrize.assets.slice(0, 2))
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
