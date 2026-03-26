import {
  ErgoUnsignedInput,
  OutputBuilder,
  TokenAmount,
  TransactionBuilder,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SByte, SColl, SConstant } from '@fleet-sdk/serializer';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

interface RaffleGiftTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  someoneWallet: KeyedMockChainParty;
  giftGiverAddress: KeyedMockChainParty;
  prizeBox: ErgoUnsignedInput;
  prizeOutputBox: OutputBuilder;
  unwrappedGiftOutputBox: OutputBuilder;
  giftBox: ErgoUnsignedInput;
  winnerBox: ErgoUnsignedInput;
  winnerOutputBox: OutputBuilder;
  giftRedeemBox: ErgoUnsignedInput;
  redeemedGiftOutputBox: OutputBuilder;
  ticketBox: ErgoUnsignedInput;
}

interface TestInterface {
  raffleGiftErgTestRequirements: RaffleGiftTestInterface;
  raffleGiftTokenTestRequirements: RaffleGiftTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create gift input box
 * @returns object
 */
const provideRaffleGiftTestRequirements = (
  extraGiftTokens: TokenAmount<bigint>[] = [],
) => {
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
  const { giftgiveraddress: giftGiverAddress, someone } =
    boxFactory.createPartners({
      giftGiverAddress: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
      someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
    });
  giftGiverAddress.addBalance({
    tokens: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 100n }],
  });

  // create winner input boxes
  const winnerBox = boxFactory.createWinnerSingleBoxMock(
    1,
    1,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    undefined,
    1n,
    0n,
    testUtils.TestConstants.GIFT_TOKEN_ID,
    [
      {
        tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
        amount: 1n,
      },
    ],
  );

  // create winner output boxes
  const winnerOutputBox = boxFactory.createWinnerOutputBoxWithConstantRegisters(
    SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
    testUtils.TestConstants.TICKET_TOKEN_ID,
    testUtils.TestConstants.GIFT_TOKEN_ID,
    BigInt(winnerBox.assets[1].amount.toString()) + 1n,
    giftCount - 1n,
  );

  // create giftRedeem input box
  const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
    1_000_000_000n,
    0n,
    testUtils.TestConstants.FEE * 2n,
    1,
    0,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    1n,
  );

  // Create prize input box
  const prizeBox = boxFactory.createWinnerPrizeBoxMock(
    testUtils.TestConstants.FEE * 3n + BigInt(prizeAmount),
    winnerIndex,
    winnerTicketIndex,
    giftCount,
    0n,
    1n,
  );

  // Create prize output box
  const prizeOutputBox = boxFactory.createWinnerPrizeOutputBox(
    testUtils.TestConstants.FEE * 3n + BigInt(prizeAmount),
    winnerIndex,
    winnerTicketIndex,
    giftCount,
    1n,
    2n,
  );

  // Create giftBox input box
  const giftBox = boxFactory.createGiftBoxMock(
    1,
    blake2b256(Buffer.from(giftGiverAddress.ergoTree, 'hex')),
    testUtils.TestConstants.FEE * 3n,
    testUtils.TestConstants.GIFT_TOKEN_ID,
    1n,
    extraGiftTokens,
  );
  giftBox.setContextExtension({
    0: SColl(SByte, Array.from(Buffer.from(giftGiverAddress.ergoTree, 'hex'))),
  });

  // Create raffleGiftErgTestRequirements.giftBox input box
  const giftOutputBoxTokens = giftBox.assets.slice(1, giftBox.assets.length);

  // Create redeemedGift output box
  const redeemedGiftOutputBox = boxFactory.createSafePayOutputBox(
    BigInt(giftBox.value.toString()) - testUtils.TestConstants.FEE,
    giftBox.assets.slice(1),
    SConstant.from(giftBox.additionalRegisters.R4!).data as Uint8Array,
  );

  // Create unwrappedGift output Box
  const unwrappedGiftOutputBox = boxFactory.createSafePayOutputBox(
    BigInt(giftBox.value) - testUtils.TestConstants.FEE,
    giftOutputBoxTokens,
    blake2b256(Buffer.from(giftGiverAddress.ergoTree, 'hex')),
  );

  // create ticket box
  const ticketBox = boxFactory.createTicketBoxMock(
    giftGiverAddress.ergoTree,
    5n,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    [0n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
  );

  return {
    boxFactory: boxFactory,
    someoneWallet: someone,
    giftGiverAddress: giftGiverAddress,
    prizeBox: prizeBox,
    prizeOutputBox: prizeOutputBox,
    unwrappedGiftOutputBox: unwrappedGiftOutputBox,
    giftBox: giftBox,
    winnerBox: winnerBox,
    winnerOutputBox: winnerOutputBox,
    giftRedeemBox: giftRedeemBox,
    redeemedGiftOutputBox: redeemedGiftOutputBox,
    ticketBox: ticketBox,
  };
};

describe('gift', () => {
  beforeEach<TestInterface>((ctx) => {
    ctx.raffleGiftErgTestRequirements = provideRaffleGiftTestRequirements();
    ctx.raffleGiftTokenTestRequirements = provideRaffleGiftTestRequirements([
      { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 100n },
    ]);
  });

  describe('Gift return', () => {
    /**
     * @target should successfully return the gift containing Erg
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully return the gift containing Erg', ({
      raffleGiftErgTestRequirements,
    }) => {
      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.winnerBox,
          raffleGiftErgTestRequirements.giftBox,
        ])
        .to([
          raffleGiftErgTestRequirements.winnerOutputBox,
          raffleGiftErgTestRequirements.redeemedGiftOutputBox,
        ])
        .withDataFrom([raffleGiftErgTestRequirements.giftRedeemBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toBeTruthy();
    });

    /**
     * @target should successfully return the gift containing Erg and tokens
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully return the gift containing Erg and tokens', ({
      raffleGiftTokenTestRequirements,
    }) => {
      const transaction = new TransactionBuilder(
        raffleGiftTokenTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftTokenTestRequirements.winnerBox,
          raffleGiftTokenTestRequirements.giftBox,
        ])
        .to([
          raffleGiftTokenTestRequirements.winnerOutputBox,
          raffleGiftTokenTestRequirements.redeemedGiftOutputBox,
        ])
        .withDataFrom([raffleGiftTokenTestRequirements.giftRedeemBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(
        raffleGiftTokenTestRequirements.boxFactory.chain.execute(transaction),
      ).toBeTruthy();
    });

    /**
     * @target should fail if winner box belongs to a different raffle
     * @scenario
     * - create winner input and output boxes by different gift token
     * - execute transaction and burn unused gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if winner box belongs to a different raffle', ({
      raffleGiftErgTestRequirements,
    }) => {
      const winnerBox =
        raffleGiftErgTestRequirements.boxFactory.createWinnerSingleBoxMock(
          1,
          1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          undefined,
          1n,
          0n,
          testUtils.TestConstants.X_TOKEN_ID,
          [
            {
              // set different gift token id
              tokenId: testUtils.TestConstants.X_TOKEN_ID,
              amount: 2n,
            },
          ],
        );

      const winnerOutputBox =
        raffleGiftErgTestRequirements.boxFactory.createWinnerOutputBoxWithConstantRegisters(
          SConstant.from(winnerBox.additionalRegisters.R4!).data as bigint[],
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // set different gift token id
          testUtils.TestConstants.X_TOKEN_ID,
          2n,
          0n,
        );

      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([winnerBox, raffleGiftErgTestRequirements.giftBox])
        .to([
          winnerOutputBox,
          raffleGiftErgTestRequirements.redeemedGiftOutputBox,
        ])
        .withDataFrom([raffleGiftErgTestRequirements.giftRedeemBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        // burn unused gift token
        .burnTokens({
          tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
          amount: 1n,
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

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
    it<TestInterface>('should fail if two similar gifts are spent in the transaction and one gift is stolen', ({
      raffleGiftErgTestRequirements,
    }) => {
      const giftBox2 =
        raffleGiftErgTestRequirements.boxFactory.createGiftBoxMock(
          1,
          blake2b256(
            Buffer.from(
              raffleGiftErgTestRequirements.giftGiverAddress.ergoTree,
              'hex',
            ),
          ),
          testUtils.TestConstants.FEE * 3n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          1n,
        );

      const stoleBox =
        raffleGiftErgTestRequirements.boxFactory.createSafePayOutputBox(
          testUtils.TestConstants.FEE * 3n,
          // stole one gift token
          [{ tokenId: testUtils.TestConstants.GIFT_TOKEN_ID, amount: 1n }],
          blake2b256(
            Buffer.from(
              raffleGiftErgTestRequirements.someoneWallet.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.winnerBox,
          raffleGiftErgTestRequirements.giftBox,
          giftBox2,
        ])
        .to([
          raffleGiftErgTestRequirements.winnerOutputBox,
          raffleGiftErgTestRequirements.redeemedGiftOutputBox,
          stoleBox,
        ])
        .withDataFrom([raffleGiftErgTestRequirements.giftRedeemBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if safe pay box does not have enough Erg
     * @scenario
     * - create redeemedGift output box by reduced Erg value
     * - execute transaction and return extra Ergs to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if safe pay box does not have enough Erg', ({
      raffleGiftErgTestRequirements,
    }) => {
      const redeemedGiftOutputBox =
        raffleGiftErgTestRequirements.boxFactory.createSafePayOutputBox(
          BigInt(raffleGiftErgTestRequirements.giftBox.value.toString()) -
            testUtils.TestConstants.FEE * 2n,
          raffleGiftErgTestRequirements.giftBox.assets.slice(1),
          SConstant.from(
            raffleGiftErgTestRequirements.giftBox.additionalRegisters.R4!,
          ).data as Uint8Array,
        );

      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.winnerBox,
          raffleGiftErgTestRequirements.giftBox,
        ])
        .to([
          raffleGiftErgTestRequirements.winnerOutputBox,
          redeemedGiftOutputBox,
        ])
        .withDataFrom([raffleGiftErgTestRequirements.giftRedeemBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(raffleGiftErgTestRequirements.someoneWallet.ergoTree)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if safe pay box does not have enough tokens
     * @scenario
     * - create unwrappedGiftOutputBox without tokens
     * - execute transaction and burn missed tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if safe pay box does not have enough tokens', ({
      raffleGiftTokenTestRequirements,
    }) => {
      const redeemedGiftOutputBox =
        raffleGiftTokenTestRequirements.boxFactory.createSafePayOutputBox(
          BigInt(raffleGiftTokenTestRequirements.giftBox.value.toString()) -
            testUtils.TestConstants.FEE,
          // missing tokens
          [],
          SConstant.from(
            raffleGiftTokenTestRequirements.giftBox.additionalRegisters.R4!,
          ).data as Uint8Array,
        );

      const transaction = new TransactionBuilder(
        raffleGiftTokenTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftTokenTestRequirements.winnerBox,
          raffleGiftTokenTestRequirements.giftBox,
        ])
        .to([
          raffleGiftTokenTestRequirements.winnerOutputBox,
          redeemedGiftOutputBox,
        ])
        .withDataFrom([raffleGiftTokenTestRequirements.giftRedeemBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(raffleGiftTokenTestRequirements.someoneWallet.ergoTree)
        .burnTokens(raffleGiftTokenTestRequirements.giftBox.assets[1])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftTokenTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if safe pay ergo tree hash is not correct
     * @scenario
     * - create redeemedGift output box by different destination address
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if safe pay ergo tree hash is not correct', ({
      raffleGiftErgTestRequirements,
    }) => {
      const redeemedGiftOutputBox =
        raffleGiftErgTestRequirements.boxFactory.createSafePayOutputBox(
          BigInt(raffleGiftErgTestRequirements.giftBox.value.toString()) -
            testUtils.TestConstants.FEE,
          raffleGiftErgTestRequirements.giftBox.assets.slice(1),
          // set different destination address
          blake2b256(
            Buffer.from(
              raffleGiftErgTestRequirements.someoneWallet.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.winnerBox,
          raffleGiftErgTestRequirements.giftBox,
        ])
        .to([
          raffleGiftErgTestRequirements.winnerOutputBox,
          redeemedGiftOutputBox,
        ])
        .withDataFrom([raffleGiftErgTestRequirements.giftRedeemBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
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
    it<TestInterface>('should successfully unwrap the gift containing Erg', ({
      raffleGiftErgTestRequirements,
    }) => {
      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.prizeBox,
          raffleGiftErgTestRequirements.giftBox,
        ])
        .to([
          raffleGiftErgTestRequirements.prizeOutputBox,
          raffleGiftErgTestRequirements.unwrappedGiftOutputBox,
        ])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .withDataFrom([raffleGiftErgTestRequirements.ticketBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toBeTruthy();
    });

    /**
     * @target should successfully unwrap the gift containing Erg and tokens
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should successfully unwrap the gift containing Erg and tokens', ({
      raffleGiftTokenTestRequirements,
    }) => {
      const transaction = new TransactionBuilder(
        raffleGiftTokenTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftTokenTestRequirements.prizeBox,
          raffleGiftTokenTestRequirements.giftBox,
        ])
        .to([
          raffleGiftTokenTestRequirements.prizeOutputBox,
          raffleGiftTokenTestRequirements.unwrappedGiftOutputBox,
        ])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .withDataFrom([raffleGiftTokenTestRequirements.ticketBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(
        raffleGiftTokenTestRequirements.boxFactory.chain.execute(transaction),
      ).toBeTruthy();
    });

    /**
     * @target should fail if winner box of a token-goal raffle belongs to a different raffle
     * @scenario
     * - create prizeBox input box by different gift token
     * - create prize output box by different gift token
     * - execute transaction and burn gift token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if winner box of a token-goal raffle belongs to a different raffle', ({
      raffleGiftErgTestRequirements,
    }) => {
      const winnerIndex = 1;
      const winnerTicketIndex = 1n;
      const giftCount = 1n;
      const totalPrize = 20_000_000n;
      const winnerRewardPercent = 200n;
      const prizeAmount = (totalPrize * winnerRewardPercent) / 1000n;

      const differentRaffleGiftTokenId = 'ab'.repeat(32);

      const prizeBox =
        raffleGiftErgTestRequirements.boxFactory.createWinnerPrizeBoxMock(
          testUtils.TestConstants.FEE * 3n + BigInt(prizeAmount),
          winnerIndex,
          winnerTicketIndex,
          giftCount,
          0n,
          1n,
          undefined,
          undefined,
          differentRaffleGiftTokenId,
        );

      const prizeOutputBox =
        raffleGiftErgTestRequirements.boxFactory.createWinnerPrizeOutputBox(
          testUtils.TestConstants.FEE * 3n + BigInt(prizeAmount),
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
      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([prizeBox, raffleGiftErgTestRequirements.giftBox])
        .to([
          prizeOutputBox,
          raffleGiftErgTestRequirements.unwrappedGiftOutputBox,
        ])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .withDataFrom([raffleGiftErgTestRequirements.ticketBox])
        // burn giftTokens on the gift box
        .burnTokens({
          tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
          amount: 1n,
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

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
    it<TestInterface>('should fail if winner box belongs to a different raffle', ({
      raffleGiftErgTestRequirements,
    }) => {
      const giftBox2 =
        raffleGiftErgTestRequirements.boxFactory.createGiftBoxMock(
          1,
          blake2b256(
            Buffer.from(
              raffleGiftErgTestRequirements.giftGiverAddress.ergoTree,
              'hex',
            ),
          ),
          testUtils.TestConstants.FEE * 3n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          1n,
        );

      const stoleBox =
        raffleGiftErgTestRequirements.boxFactory.createSafePayOutputBox(
          testUtils.TestConstants.FEE * 3n,
          // stole one gift token
          [{ tokenId: testUtils.TestConstants.GIFT_TOKEN_ID, amount: 1n }],
          blake2b256(
            Buffer.from(
              raffleGiftErgTestRequirements.someoneWallet.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.prizeBox,
          raffleGiftErgTestRequirements.giftBox,
          giftBox2,
        ])
        .to([
          raffleGiftErgTestRequirements.prizeOutputBox,
          raffleGiftErgTestRequirements.unwrappedGiftOutputBox,
          stoleBox,
        ])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .withDataFrom([raffleGiftErgTestRequirements.ticketBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if safe pay box does not have enough Erg
     * @scenario
     * - create unwrappedGiftOutputBox by reduced Erg value
     * - execute transaction and return extra Ergs to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if safe pay box does not have enough Erg', ({
      raffleGiftErgTestRequirements,
    }) => {
      const giftOutputBoxTokens =
        raffleGiftErgTestRequirements.giftBox.assets.slice(
          1,
          raffleGiftErgTestRequirements.giftBox.assets.length,
        );
      const unwrappedGiftOutputBox =
        raffleGiftErgTestRequirements.boxFactory.createSafePayOutputBox(
          // reduced by one fee from Erg value
          BigInt(raffleGiftErgTestRequirements.giftBox.value) -
            testUtils.TestConstants.FEE * 2n,
          giftOutputBoxTokens,
          blake2b256(
            Buffer.from(
              raffleGiftErgTestRequirements.giftGiverAddress.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.prizeBox,
          raffleGiftErgTestRequirements.giftBox,
        ])
        .to([
          raffleGiftErgTestRequirements.prizeOutputBox,
          unwrappedGiftOutputBox,
        ])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .withDataFrom([raffleGiftErgTestRequirements.ticketBox])
        .sendChangeTo(raffleGiftErgTestRequirements.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if safe pay box does not have enough tokens
     * @scenario
     * - create unwrappedGiftOutputBox without tokens
     * - execute transaction and burn missed tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if safe pay box does not have enough tokens', ({
      raffleGiftTokenTestRequirements,
    }) => {
      const unwrappedGiftOutputBox =
        raffleGiftTokenTestRequirements.boxFactory.createSafePayOutputBox(
          BigInt(raffleGiftTokenTestRequirements.giftBox.value) -
            testUtils.TestConstants.FEE,
          // missing tokens
          [],
          blake2b256(
            Buffer.from(
              raffleGiftTokenTestRequirements.giftGiverAddress.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        raffleGiftTokenTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftTokenTestRequirements.prizeBox,
          raffleGiftTokenTestRequirements.giftBox,
        ])
        .to([
          raffleGiftTokenTestRequirements.prizeOutputBox,
          unwrappedGiftOutputBox,
        ])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .withDataFrom([raffleGiftTokenTestRequirements.ticketBox])
        .burnTokens(raffleGiftTokenTestRequirements.giftBox.assets[1])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftTokenTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if safe pay ergo tree hash is not correct
     * @scenario
     * - create unwrappedGiftOutputBox by invalid destination address
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail if safe pay ergo tree hash is not correct', ({
      raffleGiftErgTestRequirements,
    }) => {
      const giftOutputBoxTokens =
        raffleGiftErgTestRequirements.giftBox.assets.slice(
          1,
          raffleGiftErgTestRequirements.giftBox.assets.length,
        );
      const unwrappedGiftOutputBox =
        raffleGiftErgTestRequirements.boxFactory.createSafePayOutputBox(
          BigInt(raffleGiftErgTestRequirements.giftBox.value) -
            testUtils.TestConstants.FEE,
          giftOutputBoxTokens,
          // set invalid destination address
          blake2b256(
            Buffer.from(
              raffleGiftErgTestRequirements.someoneWallet.ergoTree,
              'hex',
            ),
          ),
        );

      const transaction = new TransactionBuilder(
        raffleGiftErgTestRequirements.boxFactory.chain.height,
      )
        .from([
          raffleGiftErgTestRequirements.prizeBox,
          raffleGiftErgTestRequirements.giftBox,
        ])
        .to([
          raffleGiftErgTestRequirements.prizeOutputBox,
          unwrappedGiftOutputBox,
        ])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .withDataFrom([raffleGiftErgTestRequirements.ticketBox])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        raffleGiftErgTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });
});
