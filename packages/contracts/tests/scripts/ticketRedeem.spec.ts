import { it, describe, expect } from 'vitest';
import { TransactionBuilder, TokenAmount } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto'
import { SConstant } from '@fleet-sdk/serializer';

import * as testUtils from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';
import { mockUTxO } from '@fleet-sdk/mock-chain';


/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create ticketRedeem input box
 * @returns vitest customized "it" object
 */
const createRaffleTicketRedeemTest = (collectingToken?: TokenAmount<bigint>) => {
  const totalSoldTickets = 10n;
  const ticketPrice = collectingToken ? collectingToken.amount / totalSoldTickets : testUtils.FEE * 2n;
  const ticketCount = 1n;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'ticketRedeem',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { creator, someone, another } = boxFactory.createPartners({
    creator: testUtils.CREATOR_DEFAULT_BALANCE,
    someone: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    another: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE
  });
  creator.addBalance({ tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }] });

  const ticketRedeemBox = boxFactory.createTicketRedeemBoxMock(
    testUtils.FEE * 3n,
    totalSoldTickets,
    ticketPrice,
    0n,
    testUtils.TICKET_TOKEN_ID,
    1n,
    collectingToken,
  );

  const ticketBox = boxFactory.createTicketBoxMock(
    someone.ergoTree,
    ticketCount,
    testUtils.TICKET_TOKEN_ID,
    [0n, 1n, 100_000n, 10n], // from-ticket-range, to-ticket-range, ticket-price, deadline
  );

  let redeemedDonationValue =
    BigInt(ticketBox.value.toString()) - testUtils.FEE + ticketPrice * ticketCount;
  let ticketRedeemOutputBoxValue =
    BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount;
  const redeemedDonationTokens = []
  if (collectingToken !== undefined) {
    redeemedDonationValue = BigInt(ticketBox.value.toString()) - testUtils.FEE;
    redeemedDonationTokens.push({
      tokenId: ticketRedeemBox.assets[2].tokenId,
      amount: ticketCount * ticketPrice,
    });
    ticketRedeemOutputBoxValue = BigInt(ticketRedeemBox.value.toString());
    collectingToken = {
      tokenId: ticketRedeemBox.assets[2].tokenId,
      amount: BigInt(ticketRedeemBox.assets[2].amount) - ticketCount * ticketPrice,
    };
  }

  const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
    ticketRedeemOutputBoxValue,
    totalSoldTickets,
    ticketPrice,
    1n,
    testUtils.TICKET_TOKEN_ID,
    2n,
    collectingToken,
  );

  const redeemedDonationOutputBox = boxFactory.createSafePayOutputBox(
    redeemedDonationValue,
    redeemedDonationTokens,
    SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
  );

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    anotherOne: another,
    creator: creator,
    ticketRedeemBox: ticketRedeemBox,
    ticketBox: ticketBox,
    ticketRedeemOutputBox: ticketRedeemOutputBox,
    redeemedDonationOutputBox: redeemedDonationOutputBox,
  });
};

describe('Service', () => {
  const ticketRedeemTest = createRaffleTicketRedeemTest();
  const ticketRedeemErgGoalTest = createRaffleTicketRedeemTest({
    tokenId: testUtils.X_TOKEN_ID,
    amount: 100n
  });

  describe('Ticket redeem', () => {
    /**
     * @target should successfully proceed to ticket redeem step(Erg-goal)
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    ticketRedeemTest(
      'should successfully remove winner box and collect its ticket token(Erg-goal)',
      ({
        boxFactory,
        ticketRedeemBox,
        ticketBox,
        ticketRedeemOutputBox,
        redeemedDonationOutputBox
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target should successfully proceed to ticket redeem step(Token-goal)
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    ticketRedeemErgGoalTest(
      'should successfully remove winner box and collect its ticket token(Token-goal)',
      ({
        boxFactory,
        ticketRedeemBox,
        ticketBox,
        ticketRedeemOutputBox,
        redeemedDonationOutputBox
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).true;
      },
    );

    /**
     * @target should fail if ticket redeem doesn't have a proper license nft
     * @scenario
     * - create extraTokens input box contains replacing nft
     * - create ticketRedeem output box with different license nft
     * - execute transaction and send change to the someoneWallet
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      "should fail if ticket redeem doesn't have a proper license nft",
      ({
        boxFactory,
        someoneWallet,
        ticketRedeemBox,
        ticketBox,
        redeemedDonationOutputBox
      }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.FEE * 2n;
        const ticketCount = 1n;

        const extraTokensBox = mockUTxO({
          value: testUtils.FEE,
          ergoTree: someoneWallet.ergoTree,
          assets: [{
            tokenId: testUtils.X_TOKEN_ID,
            amount: 1n
          }]
        });

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount,
          totalSoldTickets,
          ticketPrice,
          1n,
          testUtils.TICKET_TOKEN_ID,
          2n,
          undefined,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox, extraTokensBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        expect(() => { boxFactory.chain.execute(transaction) }).toThrowError();
      },
    );

    /**
     * @target should fail if ticket redeem belongs to a different raffle (has different ticket token)
     * @scenario
     * - create extraTokens input box contains replacing ticket token
     * - create ticketRedeem output box with different ticket token
     * - execute transaction and send change to the someoneWallet
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      "should fail if ticket redeem belongs to a different raffle (has different ticket token)",
      ({
        boxFactory,
        someoneWallet,
        ticketRedeemBox,
        ticketBox,
        redeemedDonationOutputBox
      }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.FEE * 2n;
        const ticketCount = 1n;

        const extraTokensBox = mockUTxO({
          value: testUtils.FEE,
          ergoTree: someoneWallet.ergoTree,
          assets: [{
            tokenId: testUtils.X_TOKEN_ID,
            amount: 2n
          }]
        });

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount,
          totalSoldTickets,
          ticketPrice,
          1n,
          testUtils.X_TOKEN_ID,
          2n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox, extraTokensBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .sendChangeTo(someoneWallet.address)
          .build();

        expect(() => { boxFactory.chain.execute(transaction) }).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay erg deposit is not correct for an erg-goal raffle
     * @scenario
     * - create redeemedDonation output box by reduced value
     * - create ticketRedeem output box by increased value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if safe pay erg deposit is not correct for an erg-goal raffle',
      ({
        boxFactory,
        ticketRedeemBox,
        ticketBox,
      }) => {
        const ticketPrice = testUtils.FEE * 2n;
        const ticketCount = 1n;
        const totalSoldTickets = 10n;

        const redeemedDonationOutputBox = boxFactory.createSafePayOutputBox(
          // set increased value
          BigInt(ticketBox.value) - testUtils.FEE + ticketPrice * ticketCount + 5n,
          [],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );
        
        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          // set decreased value
          BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount - 5n,
          totalSoldTickets,
          ticketPrice,
          1n,
          testUtils.TICKET_TOKEN_ID,
          2n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => { boxFactory.chain.execute(transaction) }).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay erg deposit is not correct for an token-goal raffle
     * @scenario
     * - create redeemedDonation output box by increased collecting token value
     * - create ticketRedeem output box by reduced collecting token value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemErgGoalTest(
      'should fail if safe pay erg deposit is not correct for an token-goal raffle',
      ({
        boxFactory,
        ticketRedeemBox,
        ticketBox,
      }) => {
        const ticketPrice = 10n;
        const ticketCount = 1n;
        const totalSoldTickets = 10n;

        const redeemedDonationOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(ticketBox.value.toString()) - testUtils.FEE,
          [{
            tokenId: ticketRedeemBox.assets[2].tokenId,
            // set increased value
            amount: ticketCount * ticketPrice + 10n,
          }],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value),
          totalSoldTickets,
          ticketPrice,
          1n,
          testUtils.TICKET_TOKEN_ID,
          2n,
          {
            // set decreased value
            tokenId: ticketRedeemBox.assets[2].tokenId,
            amount: BigInt(ticketRedeemBox.assets[2].amount) - ticketCount * ticketPrice - 10n,
          }
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => { boxFactory.chain.execute(transaction) }).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay address hash differs from the ticket address hash
     * @scenario
     * - create redeemedDonation output box with different destination address hash
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if safe pay address hash differs from the ticket address hash',
      ({
        boxFactory,
        anotherOne,
        ticketRedeemBox,
        ticketBox,
        ticketRedeemOutputBox,
      }) => {
        const ticketPrice = testUtils.FEE * 2n;
        const ticketCount = 1n;

        const redeemedDonationOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(ticketBox.value) - testUtils.FEE + ticketPrice * ticketCount,
          [],
          // set different person wallet address hash
          blake2b256(Buffer.from(anotherOne.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => { boxFactory.chain.execute(transaction) }).toThrowError();
      },
    );

    /**
     * @target should fail if two tickets are spent in the transaction
     * @scenario
     * - create second ticketBox input box
     * - execute transaction and send change to the someoneWallet
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if two tickets are spent in the transaction',
      ({
        boxFactory,
        someoneWallet,
        ticketRedeemBox,
        ticketBox,
        ticketRedeemOutputBox,
        redeemedDonationOutputBox,
      }) => {
        const ticketCount = 1n;

        const ticketBox2 = boxFactory.createTicketBoxMock(
          someoneWallet.ergoTree,
          ticketCount,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 100_000n, 10n], // from-ticket-range, to-ticket-range, ticket-price, deadline
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox, ticketBox2])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        expect(() => { boxFactory.chain.execute(transaction) }).toThrowError();
      },
    );
  });
});
