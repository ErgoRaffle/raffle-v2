import { it, describe, expect } from 'vitest';
import { TokenAmount, TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { SConstant } from '@fleet-sdk/serializer';

import * as testUtils from '../testUtils';
import {
  X_TOKEN_ID,
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create gift input box
 * @returns vitest customized "it" object
 */
const createRaffleGiftTest = (extraGiftTokens: TokenAmount<bigint>[] = []) => {
  const winnerIndex = 1;
  const winnerTicketIndex = 1n;
  const giftCount = 1n;
  const totalPrize = 20_000_000n;
  const winnerRewardPercent = 200n;
  const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'gift',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { creator, someone } = boxFactory.createPartners({
    creator: CREATOR_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({ tokens: [{ tokenId: X_TOKEN_ID, amount: 100n }] });

  // create winner input boxes
  const winnerBox = boxFactory.createWinnerSingleBoxMock(
    1,
    1,
    testUtils.TICKET_TOKEN_ID,
    undefined,
    1n,
    0n,
    testUtils.GIFT_TOKEN_ID,
    [
      {
        tokenId: testUtils.GIFT_TOKEN_ID,
        amount: 1n,
      },
    ],
  );

  // create winner output boxes
  const winnerOutputBox = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
    testUtils.TICKET_TOKEN_ID,
    testUtils.GIFT_TOKEN_ID,
    BigInt(winnerBox.assets[1].amount.toString()) + 1n,
    giftCount - 1n,
  );

  // create giftRedeem input box
  const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
    1_000_000_000n,
    0n,
    testUtils.FEE * 2n,
    1,
    0,
    testUtils.TICKET_TOKEN_ID,
    1n,
  );

  // Create prize input box
  const prizeBox = boxFactory.createWinnerPrizeBoxMock(
    testUtils.FEE * 3n + BigInt(prizeAmount),
    winnerIndex,
    winnerTicketIndex,
    giftCount,
    0n,
    1n,
  );

  // Create prize output box
  const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
    testUtils.FEE * 3n + BigInt(prizeAmount),
    winnerIndex,
    winnerTicketIndex,
    giftCount,
    1n,
    2n,
  );

  // Create giftBox input box
  const giftBox = boxFactory.createGiftBoxMock(
    1,
    blake2b256(Buffer.from(creator.ergoTree, 'hex')),
    testUtils.FEE * 3n,
    testUtils.GIFT_TOKEN_ID,
    1n,
    extraGiftTokens,
  );

  // Create giftBox input box
  const giftOutputBoxTokens = giftBox.assets.slice(1, giftBox.assets.length);

  // Create redeemedGift output box
  const redeemedGiftOutputBox = boxFactory.createSafePayOutputBox(
    BigInt(giftBox.value.toString()) - testUtils.FEE,
    giftBox.assets.slice(1),
    SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
  );

  // Create unwrappedGift output Box
  const unwrappedGiftOutputBox = boxFactory.createSafePayOutputBox(
    BigInt(giftBox.value) - testUtils.FEE,
    giftOutputBoxTokens,
    blake2b256(Buffer.from(creator.ergoTree, 'hex')),
  );

  // create ticket box
  const ticketBox = boxFactory.createTicketBoxMock(
    creator.ergoTree,
    5n,
    testUtils.TICKET_TOKEN_ID,
    [0n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
  );

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    prizeBox: prizeBox,
    prizeOutputBox: prizeOutputBox,
    unwrappedGiftOutputBox: unwrappedGiftOutputBox,
    giftBox: giftBox,
    winnerBox: winnerBox,
    winnerOutputBox: winnerOutputBox,
    giftRedeemBox: giftRedeemBox,
    redeemedGiftOutputBox: redeemedGiftOutputBox,
    ticketBox: ticketBox,
  });
};

describe('gift', () => {
  const raffleGiftErgTest = createRaffleGiftTest();
  const raffleGiftTokenTest = createRaffleGiftTest([
    { tokenId: X_TOKEN_ID, amount: 100n },
  ]);

  describe('Gift return', () => {
    /**
     * @target should successfully return the gift containing Erg
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleGiftErgTest(
      'should successfully return the gift containing Erg',
      ({
        boxFactory,
        giftBox,
        winnerBox,
        winnerOutputBox,
        giftRedeemBox,
        redeemedGiftOutputBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftBox])
          .to([winnerOutputBox, redeemedGiftOutputBox])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target should successfully return the gift containing Erg and tokens
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleGiftTokenTest(
      'should successfully return the gift containing Erg and tokens',
      ({
        boxFactory,
        giftBox,
        winnerBox,
        winnerOutputBox,
        giftRedeemBox,
        redeemedGiftOutputBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftBox])
          .to([winnerOutputBox, redeemedGiftOutputBox])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target should fail if winner box belongs to a different raffle
     * @scenario
     * - create winner input and output boxes by different gift token
     * - execute transaction and burn unused gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if winner box belongs to a different raffle',
      ({ boxFactory, giftBox, giftRedeemBox, redeemedGiftOutputBox }) => {
        const winnerBox = boxFactory.createWinnerSingleBoxMock(
          1,
          1,
          testUtils.TICKET_TOKEN_ID,
          undefined,
          1n,
          0n,
          testUtils.X_TOKEN_ID,
          [
            {
              // set different gift token id
              tokenId: testUtils.X_TOKEN_ID,
              amount: 2n,
            },
          ],
        );

        const winnerOutputBox =
          boxFactory.createWinnerOutputBoxWithConstantRegisters(
            SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
            testUtils.TICKET_TOKEN_ID,
            // set different gift token id
            testUtils.X_TOKEN_ID,
            2n,
            0n,
          );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftBox])
          .to([winnerOutputBox, redeemedGiftOutputBox])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          // burn unused gift token
          .burnTokens({ tokenId: testUtils.GIFT_TOKEN_ID, amount: 1n })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if two similar gifts are spent in the transaction and one gift is stolen
     * @scenario
     * - create second gift input box
     * - create stole output box
     * - execute transaction and return extra Ergs to the someoneWallet
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if two similar gifts are spent in the transaction and one gift is stolen',
      ({
        boxFactory,
        creator,
        someoneWallet,
        giftBox,
        winnerBox,
        winnerOutputBox,
        giftRedeemBox,
        redeemedGiftOutputBox,
      }) => {
        const giftBox2 = boxFactory.createGiftBoxMock(
          1,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          testUtils.FEE * 3n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        const stoleBox = boxFactory.createSafePayOutputBox(
          testUtils.FEE * 3n,
          // stole one gift token
          [{ tokenId: testUtils.GIFT_TOKEN_ID, amount: 1n }],
          blake2b256(Buffer.from(someoneWallet.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftBox, giftBox2])
          .to([winnerOutputBox, redeemedGiftOutputBox, stoleBox])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay box does not have enough Erg
     * @scenario
     * - create redeemedGift output box by reduced Erg value
     * - execute transaction and return extra Ergs to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if safe pay box does not have enough Erg',
      ({
        boxFactory,
        someoneWallet,
        giftBox,
        winnerBox,
        winnerOutputBox,
        giftRedeemBox,
      }) => {
        const redeemedGiftOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE * 2n,
          giftBox.assets.slice(1),
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftBox])
          .to([winnerOutputBox, redeemedGiftOutputBox])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.ergoTree)
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay box does not have enough tokens
     * @scenario
     * - create unwrappedGiftOutputBox without tokens
     * - execute transaction and burn missed tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftTokenTest(
      'should fail if safe pay box does not have enough tokens',
      ({
        boxFactory,
        someoneWallet,
        giftBox,
        winnerBox,
        winnerOutputBox,
        giftRedeemBox,
      }) => {
        const redeemedGiftOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          // missing tokens
          [],
          SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftBox])
          .to([winnerOutputBox, redeemedGiftOutputBox])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.ergoTree)
          .burnTokens(giftBox.assets[1])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay ergo tree hash is not correct
     * @scenario
     * - create redeemedGift output box by different destination address
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if safe pay ergo tree hash is not correct',
      ({
        boxFactory,
        someoneWallet,
        giftBox,
        winnerBox,
        winnerOutputBox,
        giftRedeemBox,
      }) => {
        const redeemedGiftOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value.toString()) - testUtils.FEE,
          giftBox.assets.slice(1),
          // set different destination address
          blake2b256(Buffer.from(someoneWallet.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([winnerBox, giftBox])
          .to([winnerOutputBox, redeemedGiftOutputBox])
          .withDataFrom([giftRedeemBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });

  describe('Gift unwrap', () => {
    /**
     * @target should successfully unwrap the gift containing Erg
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleGiftErgTest(
      'should successfully unwrap the gift containing Erg and tokens',
      ({
        boxFactory,
        prizeBox,
        giftBox,
        prizeOutputBox,
        unwrappedGiftOutputBox,
        ticketBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([prizeBox, giftBox])
          .to([prizeOutputBox, unwrappedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target should successfully unwrap the gift containing Erg and tokens
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleGiftTokenTest(
      'should successfully unwrap the gift containing Erg and tokens',
      ({
        boxFactory,
        prizeBox,
        giftBox,
        prizeOutputBox,
        unwrappedGiftOutputBox,
        ticketBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([prizeBox, giftBox])
          .to([prizeOutputBox, unwrappedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target should fail if winner box belongs to a different raffle
     * @scenario
     * - create prizeBox input box by different gift token
     * - create prize output box by different gift token
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if winner box belongs to a different raffle',
      ({ boxFactory, giftBox, unwrappedGiftOutputBox, ticketBox }) => {
        const winnerIndex = 1;
        const winnerTicketIndex = 1n;
        const giftCount = 1n;
        const totalPrize = 20_000_000n;
        const winnerRewardPercent = 200n;
        const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;

        const differentRaffleGiftTokenId = 'ab'.repeat(32);

        const prizeBox = boxFactory.createWinnerPrizeBoxMock(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          winnerIndex,
          winnerTicketIndex,
          giftCount,
          0n,
          1n,
          undefined,
          undefined,
          differentRaffleGiftTokenId,
        );

        const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
          testUtils.FEE * 3n + BigInt(prizeAmount),
          winnerIndex,
          winnerTicketIndex,
          giftCount,
          1n,
          1n,
          undefined,
          undefined,
          // set different gift token
          differentRaffleGiftTokenId,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([prizeBox, giftBox])
          .to([prizeOutputBox, unwrappedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          // burn giftTokens on the gift box
          .burnTokens({ tokenId: testUtils.GIFT_TOKEN_ID, amount: 1n })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if winner box belongs to a different raffle
     * @scenario
     * - create second gift input box
     * - create stole output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if winner box belongs to a different raffle',
      ({
        boxFactory,
        creator,
        someoneWallet,
        prizeBox,
        giftBox,
        prizeOutputBox,
        unwrappedGiftOutputBox,
        ticketBox,
      }) => {
        const giftBox2 = boxFactory.createGiftBoxMock(
          1,
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
          testUtils.FEE * 3n,
          testUtils.GIFT_TOKEN_ID,
          1n,
        );

        const stoleBox = boxFactory.createSafePayOutputBox(
          testUtils.FEE * 3n,
          // stole one gift token
          [{ tokenId: testUtils.GIFT_TOKEN_ID, amount: 1n }],
          blake2b256(Buffer.from(someoneWallet.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([prizeBox, giftBox, giftBox2])
          .to([prizeOutputBox, unwrappedGiftOutputBox, stoleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay box does not have enough Erg
     * @scenario
     * - create unwrappedGiftOutputBox by reduced Erg value
     * - execute transaction and return extra Ergs to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if safe pay box does not have enough Erg',
      ({
        boxFactory,
        creator,
        someoneWallet,
        prizeBox,
        giftBox,
        prizeOutputBox,
        ticketBox,
      }) => {
        const giftOutputBoxTokens = giftBox.assets.slice(
          1,
          giftBox.assets.length,
        );
        const unwrappedGiftOutputBox = boxFactory.createSafePayOutputBox(
          // reduced by one fee from Erg value
          BigInt(giftBox.value) - testUtils.FEE * 2n,
          giftOutputBoxTokens,
          blake2b256(creator.ergoTree),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([prizeBox, giftBox])
          .to([prizeOutputBox, unwrappedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay box does not have enough tokens
     * @scenario
     * - create unwrappedGiftOutputBox without tokens
     * - execute transaction and burn missed tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftTokenTest(
      'should fail if safe pay box does not have enough tokens',
      ({
        boxFactory,
        creator,
        prizeBox,
        giftBox,
        prizeOutputBox,
        ticketBox,
      }) => {
        const unwrappedGiftOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value) - testUtils.FEE,
          // missing tokens
          [],
          blake2b256(creator.ergoTree),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([prizeBox, giftBox])
          .to([prizeOutputBox, unwrappedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          .burnTokens(giftBox.assets[1])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay ergo tree hash is not correct
     * @scenario
     * - create unwrappedGiftOutputBox by invalid destination address
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleGiftErgTest(
      'should fail if safe pay ergo tree hash is not correct',
      ({
        boxFactory,
        someoneWallet,
        prizeBox,
        giftBox,
        prizeOutputBox,
        ticketBox,
      }) => {
        const giftOutputBoxTokens = giftBox.assets.slice(
          1,
          giftBox.assets.length,
        );
        const unwrappedGiftOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(giftBox.value) - testUtils.FEE,
          giftOutputBoxTokens,
          // set invalid destination address
          blake2b256(Buffer.from(someoneWallet.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([prizeBox, giftBox])
          .to([prizeOutputBox, unwrappedGiftOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .withDataFrom([ticketBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
