import {
  TransactionBuilder,
  TokenAmount,
  OutputBuilder,
  ErgoUnsignedInput,
} from '@fleet-sdk/core';
import { KeyedMockChainParty, mockUTxO } from '@fleet-sdk/mock-chain';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

interface RaffleGiftRedeemTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  someoneWallet: KeyedMockChainParty;
  creator: KeyedMockChainParty;
  winnerBox: ErgoUnsignedInput;
  giftRedeemBox: ErgoUnsignedInput;
  giftRedeemBoxForTicketRedeemBox: ErgoUnsignedInput;
  giftRedeemOutputBox: OutputBuilder;
  ticketRedeemOutputBox: OutputBuilder;
}

interface TestInterface {
  giftRedeemTestRequirements: RaffleGiftRedeemTestInterface;
  giftRedeemTokenGoalTestRequirements: RaffleGiftRedeemTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create required input & output boxes
 * @returns object
 */
const provideRaffleGiftRedeemTest = (collectingToken?: TokenAmount<bigint>) => {
  const winnersCount = 2;
  const totalSoldTickets = 10n;
  const ticketPrice = testUtils.TestConstants.FEE * 2n;
  const step = 1;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'giftRedeem',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { creator, someone } = boxFactory.createPartners({
    creator: testUtils.TestConstants.CREATOR_DEFAULT_BALANCE,
    someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  someone.addBalance({
    tokens: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 100n }],
  });

  // create input winner box
  const winnerBox = boxFactory.createWinnerSingleBoxMock(
    step,
    winnersCount,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    undefined,
    2000n,
    0n,
    testUtils.TestConstants.GIFT_TOKEN_ID,
    [
      {
        tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
        amount: 1000n,
      },
    ],
  );

  // create input giftRedeem box
  const giftRedeemBox = boxFactory.createGiftRedeemBoxMock(
    1_000_000_000n,
    totalSoldTickets,
    testUtils.TestConstants.FEE * 2n,
    winnersCount,
    step,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    1n,
    collectingToken,
  );
  const giftRedeemBoxForTicketRedeemBox = boxFactory.createGiftRedeemBoxMock(
    1_000_000_000n,
    totalSoldTickets,
    testUtils.TestConstants.FEE * 2n,
    winnersCount,
    step + 2,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    1n,
    collectingToken,
  );

  // create output giftRedeem box
  const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
    BigInt(giftRedeemBox.value.toString()) +
      BigInt(winnerBox.value) -
      testUtils.TestConstants.FEE,
    totalSoldTickets,
    ticketPrice,
    winnersCount,
    step + 1,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    BigInt(giftRedeemBox.assets[1].amount.toString()) + 1n,
    giftRedeemBox.assets[2],
  );

  const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
    BigInt(giftRedeemBox.value.toString()) - testUtils.TestConstants.FEE,
    totalSoldTickets,
    ticketPrice,
    0n,
    giftRedeemBox.assets[1].tokenId,
    BigInt(giftRedeemBox.assets[1].amount.toString()),
  );
  if (giftRedeemBox.assets.length > 2)
    ticketRedeemOutputBox.assets.add(giftRedeemBox.assets[2]);

  return {
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    winnerBox: winnerBox,
    giftRedeemBox: giftRedeemBox,
    giftRedeemBoxForTicketRedeemBox: giftRedeemBoxForTicketRedeemBox,
    giftRedeemOutputBox: giftRedeemOutputBox,
    ticketRedeemOutputBox: ticketRedeemOutputBox,
  };
};

describe('giftRedeem', () => {
  beforeEach<TestInterface>((ctx) => {
    ctx.giftRedeemTestRequirements = provideRaffleGiftRedeemTest();
    ctx.giftRedeemTokenGoalTestRequirements = provideRaffleGiftRedeemTest({
      tokenId: testUtils.TestConstants.X_TOKEN_ID,
      amount: 100n,
    });
  });

  describe('Winner box removal', () => {
    /**
     * @target should successfully remove winner box and collect its ticket token
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    it<TestInterface>('should successfully remove winner box and collect its ticket token', ({
      giftRedeemTestRequirements,
    }) => {
      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([
          giftRedeemTestRequirements.giftRedeemBox,
          giftRedeemTestRequirements.winnerBox,
        ])
        .to([giftRedeemTestRequirements.giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .burnTokens(giftRedeemTestRequirements.winnerBox.assets[1]!)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toBeTruthy();
    });

    /**
     * @target should fail if winner box Erg value is not deposited to gift redeem box
     * @scenario
     * - create giftRedeemOutputBox output box by reduced value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if winner box Erg value is not deposited to gift redeem box', ({
      giftRedeemTestRequirements,
    }) => {
      const winnersCount = 2;
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;
      const step = 1;

      const giftRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createGiftRedeemOutputBox(
          // reduced value of the box and move to the someoneWallet
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) +
            BigInt(giftRedeemTestRequirements.winnerBox.value) -
            testUtils.TestConstants.FEE * 2n,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          step + 1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          BigInt(
            giftRedeemTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ) + 1n,
          giftRedeemTestRequirements.giftRedeemBox.assets[2],
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([
          giftRedeemTestRequirements.giftRedeemBox,
          giftRedeemTestRequirements.winnerBox,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .burnTokens(giftRedeemTestRequirements.winnerBox.assets[1]!)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if winner box ticket token is stolen
     * @scenario
     * - create giftRedeemOutputBox output box without ticket token
     * - create extraErgInputBox
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if winner box ticket token is stolen', ({
      giftRedeemTestRequirements,
    }) => {
      const winnersCount = 2;
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;
      const step = 1;

      const giftRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createGiftRedeemOutputBox(
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) +
            BigInt(giftRedeemTestRequirements.winnerBox.value) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          step + 1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // preventing of adding one extra ticket token to this box
          BigInt(
            giftRedeemTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ),
          giftRedeemTestRequirements.giftRedeemBox.assets[2],
        );

      const extraErgInputBox = mockUTxO({
        value: testUtils.TestConstants.FEE,
        ergoTree: giftRedeemTestRequirements.someoneWallet.ergoTree,
      });

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([
          giftRedeemTestRequirements.giftRedeemBox,
          giftRedeemTestRequirements.winnerBox,
          extraErgInputBox,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .burnTokens(giftRedeemTestRequirements.winnerBox.assets[1]!)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if gift redeem collecting token is lost in outputs
     * @scenario
     * - create giftRedeemOutputBox output box by extra amount of collecting token
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if gift redeem collecting token is lost in outputs', ({
      giftRedeemTokenGoalTestRequirements,
    }) => {
      const winnersCount = 2;
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;
      const step = 1;

      const giftRedeemOutputBox =
        giftRedeemTokenGoalTestRequirements.boxFactory.createGiftRedeemOutputBox(
          BigInt(
            giftRedeemTokenGoalTestRequirements.giftRedeemBox.value.toString(),
          ) +
            BigInt(giftRedeemTokenGoalTestRequirements.winnerBox.value) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          step + 1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // put extra amount of collecting token
          BigInt(
            giftRedeemTokenGoalTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ) + 1n,
        );

      const extraErgInputBox = mockUTxO({
        value: testUtils.TestConstants.FEE,
        ergoTree: giftRedeemTokenGoalTestRequirements.someoneWallet.ergoTree,
      });

      const transaction = new TransactionBuilder(
        giftRedeemTokenGoalTestRequirements.boxFactory.chain.height,
      )
        .from([
          giftRedeemTokenGoalTestRequirements.giftRedeemBox,
          giftRedeemTokenGoalTestRequirements.winnerBox,
          extraErgInputBox,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(giftRedeemTokenGoalTestRequirements.someoneWallet.address)
        .burnTokens(giftRedeemTokenGoalTestRequirements.winnerBox.assets[1]!)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTokenGoalTestRequirements.boxFactory.chain.execute(
          transaction,
        ),
      ).toThrowError();
    });

    /**
     * @target should fail if winners count is altered in gift redeem output box
     * @scenario
     * - create giftRedeemOutputBox output box by invalid R5 value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if winners count is altered in gift redeem output box', ({
      giftRedeemTestRequirements,
    }) => {
      const winnersCount = 2;
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;
      const step = 1;

      const giftRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createGiftRedeemOutputBox(
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) +
            BigInt(giftRedeemTestRequirements.winnerBox.value) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          // set invalid R5 value
          winnersCount + 1,
          step + 1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          BigInt(
            giftRedeemTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ) + 1n,
          giftRedeemTestRequirements.giftRedeemBox.assets[2],
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([
          giftRedeemTestRequirements.giftRedeemBox,
          giftRedeemTestRequirements.winnerBox,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .burnTokens(giftRedeemTestRequirements.winnerBox.assets[1]!)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if step is not updated correctly
     * @scenario
     * - create giftRedeemOutputBox output box by invalid R6 value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if step is not updated correctly', ({
      giftRedeemTestRequirements,
    }) => {
      const winnersCount = 2;
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;
      const step = 1;

      const giftRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createGiftRedeemOutputBox(
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) +
            BigInt(giftRedeemTestRequirements.winnerBox.value) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          // set invalid R6 value
          step + 2,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          BigInt(
            giftRedeemTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ) + 1n,
          giftRedeemTestRequirements.giftRedeemBox.assets[2],
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([
          giftRedeemTestRequirements.giftRedeemBox,
          giftRedeemTestRequirements.winnerBox,
        ])
        .to([giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .burnTokens(giftRedeemTestRequirements.winnerBox.assets[1]!)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if winner box belongs to a different raffle
     * @scenario
     * - create extra extra ticket token input box
     * - create winner input box by different ticket token id
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if winner box belongs to a different raffle', ({
      giftRedeemTestRequirements,
    }) => {
      const winnersCount = 2;
      const step = 1;

      const extraTicketTokenInputBox = mockUTxO({
        value: testUtils.TestConstants.FEE,
        ergoTree: giftRedeemTestRequirements.someoneWallet.ergoTree,
        assets: [
          { tokenId: testUtils.TestConstants.TICKET_TOKEN_ID, amount: 1n },
        ],
      });

      const winnerBox =
        giftRedeemTestRequirements.boxFactory.createWinnerSingleBoxMock(
          step,
          winnersCount,
          // set different ticket token id
          testUtils.TestConstants.X_TOKEN_ID,
          undefined,
          2000n,
          0n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([
          giftRedeemTestRequirements.giftRedeemBox,
          winnerBox,
          extraTicketTokenInputBox,
        ])
        .to([giftRedeemTestRequirements.giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .burnTokens(giftRedeemTestRequirements.winnerBox.assets[1]!)
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if winner index in winner box is not compatible with step
     * @scenario
     * - create winner input box by invalid step
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if winner index in winner box is not compatible with step', ({
      giftRedeemTestRequirements,
    }) => {
      const winnersCount = 2;

      const winnerBox =
        giftRedeemTestRequirements.boxFactory.createWinnerSingleBoxMock(
          // set invalid step
          2,
          winnersCount,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          undefined,
          2000n,
          0n,
          testUtils.TestConstants.GIFT_TOKEN_ID,
          [
            {
              tokenId: testUtils.TestConstants.GIFT_TOKEN_ID,
              amount: 1000n,
            },
          ],
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([giftRedeemTestRequirements.giftRedeemBox, winnerBox])
        .to([giftRedeemTestRequirements.giftRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .burnTokens(winnerBox.assets[1]!)
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });

  describe('Move to ticket redeem step', () => {
    /**
     * @target should successfully proceed to ticket redeem step
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    it<TestInterface>('should successfully proceed to ticket redeem step', ({
      giftRedeemTestRequirements,
    }) => {
      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([giftRedeemTestRequirements.giftRedeemBoxForTicketRedeemBox])
        .to([giftRedeemTestRequirements.ticketRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toBeTruthy();
    });

    /**
     * @target should fail if any Erg is stolen from the ticket redeem box
     * @scenario
     * - create ticketRedeemOutputBox output box by reduced value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if any Erg is stolen from the ticket redeem box', ({
      giftRedeemTestRequirements,
    }) => {
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;

      const ticketRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createTicketRedeemOutputBox(
          // reduced value of the box and move to the someoneWallet
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) -
            testUtils.TestConstants.FEE * 2n,
          totalSoldTickets,
          ticketPrice,
          0n,
          giftRedeemTestRequirements.giftRedeemBox.assets[1].tokenId,
          BigInt(
            giftRedeemTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ),
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([giftRedeemTestRequirements.giftRedeemBoxForTicketRedeemBox])
        .to([ticketRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if any token is stolen from the ticket redeem box
     * @scenario
     * - create ticketRedeemOutputBox output box without ticket token
     * - execute transaction ant burn ticket token
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if any token is stolen from the ticket redeem box', ({
      giftRedeemTestRequirements,
    }) => {
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;

      const ticketRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createTicketRedeemOutputBox(
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          0n,
          testUtils.TestConstants.X_TOKEN_ID,
          // prevent of inserting any ticket token
          0n,
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([giftRedeemTestRequirements.giftRedeemBoxForTicketRedeemBox])
        .to([ticketRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .burnTokens(giftRedeemTestRequirements.giftRedeemBox.assets[1])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if the content of register R4 is incorrect
     * @scenario
     * - create ticketRedeemOutputBox output box with reduced totalSoldTickets value
     * - execute transaction ant burn ticket token
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if the content of register R4 is incorrect', ({
      giftRedeemTestRequirements,
    }) => {
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;

      const ticketRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createTicketRedeemOutputBox(
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) -
            testUtils.TestConstants.FEE,
          // set invalid totalSoldTickets value
          totalSoldTickets - 1n,
          ticketPrice,
          0n,
          giftRedeemTestRequirements.giftRedeemBox.assets[1].tokenId,
          BigInt(
            giftRedeemTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ),
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([giftRedeemTestRequirements.giftRedeemBoxForTicketRedeemBox])
        .to([ticketRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });

    /**
     * @target should fail if the redeem tickets value is not set to zero
     * @scenario
     * - create ticketRedeemOutputBox output box by invalid redeemedTickets amount
     * - execute transaction ant burn ticket token
     * - result of execution must be fail
     * @expected
     * - transaction execution must throw exception
     */
    it<TestInterface>('should fail if the redeem tickets value is not set to zero', ({
      giftRedeemTestRequirements,
    }) => {
      const totalSoldTickets = 10n;
      const ticketPrice = testUtils.TestConstants.FEE * 2n;

      const ticketRedeemOutputBox =
        giftRedeemTestRequirements.boxFactory.createTicketRedeemOutputBox(
          BigInt(giftRedeemTestRequirements.giftRedeemBox.value.toString()) -
            testUtils.TestConstants.FEE,
          totalSoldTickets,
          ticketPrice,
          // set invalid redeemedTickets value
          1n,
          giftRedeemTestRequirements.giftRedeemBox.assets[1].tokenId,
          BigInt(
            giftRedeemTestRequirements.giftRedeemBox.assets[1].amount.toString(),
          ),
        );

      const transaction = new TransactionBuilder(
        giftRedeemTestRequirements.boxFactory.chain.height,
      )
        .from([giftRedeemTestRequirements.giftRedeemBoxForTicketRedeemBox])
        .to([ticketRedeemOutputBox])
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .sendChangeTo(giftRedeemTestRequirements.someoneWallet.address)
        .payFee(testUtils.TestConstants.FEE)
        .build();

      expect(() =>
        giftRedeemTestRequirements.boxFactory.chain.execute(transaction),
      ).toThrowError();
    });
  });
});
