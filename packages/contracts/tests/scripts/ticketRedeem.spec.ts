import { TransactionBuilder, TokenAmount } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { mockUTxO } from '@fleet-sdk/mock-chain';
import { SByte, SColl, SConstant } from '@fleet-sdk/serializer';
import { it, describe, expect } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create required input & output boxes
 * @returns vitest customized "it" object
 */
const createTicketRedeemTest = (collectingToken?: TokenAmount<bigint>) => {
  const totalSoldTickets = 10n;
  const ticketPrice = collectingToken
    ? collectingToken.amount / totalSoldTickets
    : testUtils.TestConstants.FEE * 2n;
  const ticketCount = 1n;
  const isErgGoal = collectingToken == undefined;
  const creationFee = 1_000_000n;
  const winnersCount = 3n;

  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 100 },
    constants.scriptList.filter(
      (value) => value != 'ticketRedeem',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(10);
  const { creator, someone, another } = boxFactory.createPartners({
    creator: testUtils.TestConstants.CREATOR_DEFAULT_BALANCE,
    someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
    another: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({
    tokens: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 100n }],
  });

  const ticketRedeemBox = boxFactory.createTicketRedeemBoxMock(
    creationFee +
      winnersCount * 3n * testUtils.TestConstants.FEE +
      6n * testUtils.TestConstants.FEE +
      (isErgGoal ? ticketCount * ticketPrice : 0n),
    totalSoldTickets,
    ticketPrice,
    0n,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    1n,
    collectingToken,
  );

  const ticketBox = boxFactory.createTicketBoxMock(
    someone.ergoTree,
    ticketCount,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    [0n, 1n, ticketPrice, 1000n], // from-ticket-range, to-ticket-range, ticket-price, deadline
  );

  let redeemedDonationValue =
    BigInt(ticketBox.value.toString()) -
    testUtils.TestConstants.FEE +
    ticketPrice * ticketCount;
  let ticketRedeemOutputBoxValue =
    BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount;
  const redeemedDonationTokens = [];
  if (collectingToken !== undefined) {
    redeemedDonationValue =
      BigInt(ticketBox.value.toString()) - testUtils.TestConstants.FEE;
    redeemedDonationTokens.push({
      tokenId: ticketRedeemBox.assets[2].tokenId,
      amount: ticketCount * ticketPrice,
    });
    ticketRedeemOutputBoxValue = BigInt(ticketRedeemBox.value.toString());
    collectingToken = {
      tokenId: ticketRedeemBox.assets[2].tokenId,
      amount:
        BigInt(ticketRedeemBox.assets[2].amount) - ticketCount * ticketPrice,
    };
  }

  const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
    ticketRedeemOutputBoxValue,
    totalSoldTickets,
    ticketPrice,
    1n,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    2n,
    collectingToken,
  );

  const redeemedDonationOutputBox = boxFactory.createSafePayOutputBox(
    redeemedDonationValue,
    redeemedDonationTokens,
    SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
  );

  const ticketRedeemBoxForLicenseRedeem = boxFactory.createTicketRedeemBoxMock(
    testUtils.TestConstants.FEE * 3n,
    totalSoldTickets,
    ticketPrice,
    10n,
    testUtils.TestConstants.TICKET_TOKEN_ID,
    10n,
    collectingToken,
  );
  ticketRedeemBoxForLicenseRedeem.setContextExtension({
    0: SColl(SByte, Array.from(Buffer.from(creator.ergoTree, 'hex'))),
  });
  const serviceBox = boxFactory.createServiceBoxMock(
    creator.ergoTree,
    999_999_999n,
  );
  const serviceOutputBox = boxFactory.createServiceOutputBox(
    creator.ergoTree,
    1_000_000_000n,
  );
  const serviceFeeBox = boxFactory.createSafePayOutputBox(
    BigInt(ticketRedeemBoxForLicenseRedeem.value.toString()) -
      testUtils.TestConstants.FEE,
    ticketRedeemBoxForLicenseRedeem.assets[2]
      ? [ticketRedeemBoxForLicenseRedeem.assets[2]]
      : [],
    blake2b256(Buffer.from(creator.ergoTree, 'hex')),
  );

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    anotherOne: another,
    creator: creator,
    ticketBox: ticketBox,
    ticketRedeemBox: ticketRedeemBox,
    ticketRedeemOutputBox: ticketRedeemOutputBox,
    redeemedDonationOutputBox: redeemedDonationOutputBox,
    ticketRedeemBoxForLicenseRedeem: ticketRedeemBoxForLicenseRedeem,
    serviceBox: serviceBox,
    serviceOutputBox: serviceOutputBox,
    serviceFeeBox: serviceFeeBox,
  });
};

describe('ticketRedeem', () => {
  const ticketRedeemTest = createTicketRedeemTest();
  const ticketRedeemTokenGoalTest = createTicketRedeemTest({
    tokenId: testUtils.TestConstants.X_TOKEN_ID,
    amount: 100n,
  });

  describe('Ticket redeem', () => {
    /**
     * @target should successfully return ticket tokens and redeem the donation for an erg-goal raffle
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    ticketRedeemTest(
      'should successfully return ticket tokens and redeem the donation for an erg-goal raffle',
      ({
        boxFactory,
        ticketRedeemBox,
        ticketBox,
        ticketRedeemOutputBox,
        redeemedDonationOutputBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).toBeTruthy();
      },
    );

    /**
     * @target should successfully return ticket tokens and redeem the donation for a token-goal raffle
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    ticketRedeemTokenGoalTest(
      'should successfully return ticket tokens and redeem the donation for a token-goal raffle',
      ({
        boxFactory,
        ticketRedeemBox,
        ticketBox,
        ticketRedeemOutputBox,
        redeemedDonationOutputBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).toBeTruthy();
      },
    );

    /**
     * @target should fail if ticket redeem box assets decreases more than the redeemed donation in an erg-goal raffle
     * @scenario
     * - create redeemedDonation & ticketRedeem output boxes with invalid amount of value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if ticket redeem box assets decreases more than the redeemed donation in an erg-goal raffle',
      ({ boxFactory, ticketBox, ticketRedeemBox }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.TestConstants.FEE * 2n;
        const ticketCount = 1n;
        const redeemedDonationOutputBox = boxFactory.createSafePayOutputBox(
          // set increased value
          BigInt(ticketBox.value) -
            testUtils.TestConstants.FEE +
            ticketPrice * ticketCount +
            5n,
          [],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          // set decreased value
          BigInt(ticketRedeemBox.value.toString()) -
            ticketPrice * ticketCount -
            5n,
          totalSoldTickets,
          ticketPrice,
          1n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          2n,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if ticket redeem box assets decreases more than the redeemed donation in a token-goal raffle
     * @scenario
     * - create redeemedDonation & ticketRedeem output boxes with invalid amount of collecting token value
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTokenGoalTest(
      'should fail if ticket redeem box assets decreases more than the redeemed donation in a token-goal raffle',
      ({ boxFactory, ticketBox, ticketRedeemBox }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = 10n;
        const ticketCount = 1n;

        const redeemedDonationOutputBox = boxFactory.createSafePayOutputBox(
          BigInt(ticketBox.value.toString()) - testUtils.TestConstants.FEE,
          [
            {
              tokenId: ticketRedeemBox.assets[2].tokenId,
              // set increased value
              amount: ticketCount * ticketPrice + 10n,
            },
          ],
          SConstant.from(ticketBox.additionalRegisters.R4!).data as Uint8Array,
        );

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value),
          totalSoldTickets,
          ticketPrice,
          1n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          2n,
          {
            // set decreased value
            tokenId: ticketRedeemBox.assets[2].tokenId,
            amount:
              BigInt(ticketRedeemBox.assets[2].amount) -
              ticketCount * ticketPrice -
              10n,
          },
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if one ticket token is stolen (not collected by the ticket redeem box)
     * @scenario
     * - create ticketRedeem output box by decreased amount of ticket token
     * - execute transaction & burn one ticket token
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if one ticket token is stolen (not collected by the ticket redeem box)',
      ({
        boxFactory,
        ticketBox,
        ticketRedeemBox,
        redeemedDonationOutputBox,
      }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.TestConstants.FEE * 2n;
        const ticketCount = 1n;

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount,
          totalSoldTickets,
          ticketPrice,
          1n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          // set decreased amount of ticket-token
          1n,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens({
            tokenId: testUtils.TestConstants.TICKET_TOKEN_ID,
            amount: 1n,
          })
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if total sold ticket value changes in output ticket redeem
     * @scenario
     * - create ticketRedeem output box by invalid totalSoldTickets
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if total sold ticket value changes in output ticket redeem',
      ({
        boxFactory,
        ticketBox,
        ticketRedeemBox,
        redeemedDonationOutputBox,
      }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.TestConstants.FEE * 2n;
        const ticketCount = 1n;

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount,
          // set invalid totalSoldTickets
          totalSoldTickets - 1n,
          ticketPrice,
          1n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          2n,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if redeemed ticket count is not updated correctly
     * @scenario
     * - create ticketRedeem output box by invalid redeemedTickets
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if redeemed ticket count is not updated correctly',
      ({
        boxFactory,
        ticketBox,
        ticketRedeemBox,
        redeemedDonationOutputBox,
      }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.TestConstants.FEE * 2n;
        const ticketCount = 1n;

        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount,
          totalSoldTickets,
          ticketPrice,
          // set invalid redeemedTickets amount
          0n,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          2n,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if ticket belongs to a different raffle (different ticket token)
     * @scenario
     * - create extraTokenBox that contains required ticket token
     * - create ticketRedeem input & output box by different ticket token
     * - execute transaction & send ergs of extraTokenBox to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if ticket belongs to a different raffle (different ticket token)',
      ({ boxFactory, someoneWallet, ticketBox, redeemedDonationOutputBox }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.TestConstants.FEE * 2n;
        const ticketCount = 1n;
        const creationFee = 1_000_000n;
        const winnersCount = 3n;

        const extraTokenBox = mockUTxO({
          value: testUtils.TestConstants.FEE,
          ergoTree: constants.TRUE_SCRIPT_HEX,
          assets: [
            {
              tokenId: testUtils.TestConstants.X_TOKEN_ID,
              amount: 1n,
            },
          ],
        });
        const ticketRedeemBox = boxFactory.createTicketRedeemBoxMock(
          creationFee +
            winnersCount * 3n * testUtils.TestConstants.FEE +
            6n * testUtils.TestConstants.FEE +
            ticketCount * ticketPrice,
          totalSoldTickets,
          ticketPrice,
          0n,
          // set different ticket token id
          testUtils.TestConstants.X_TOKEN_ID,
          1n,
        );
        const ticketRedeemOutputBox = boxFactory.createTicketRedeemOutputBox(
          BigInt(ticketRedeemBox.value.toString()) - ticketPrice * ticketCount,
          totalSoldTickets,
          ticketPrice,
          1n,
          // set different ticket token id
          testUtils.TestConstants.X_TOKEN_ID,
          2n,
        );
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([ticketRedeemBox, ticketBox, extraTokenBox])
          .to([ticketRedeemOutputBox, redeemedDonationOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );
  });

  describe('License redeem', () => {
    /**
     * @target should successfully return license tokens for an erg-goal raffle
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    ticketRedeemTest(
      'should successfully return license tokens for an erg-goal raffle',
      ({
        boxFactory,
        serviceBox,
        serviceOutputBox,
        ticketRedeemBoxForLicenseRedeem,
        serviceFeeBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, ticketRedeemBoxForLicenseRedeem])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(ticketRedeemBoxForLicenseRedeem.assets[1])
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).toBeTruthy();
      },
    );

    /**
     * @target should successfully return license tokens for a token-goal raffle
     * @scenario
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    ticketRedeemTokenGoalTest(
      'should successfully return license tokens for a token-goal raffle',
      ({
        boxFactory,
        serviceBox,
        serviceOutputBox,
        ticketRedeemBoxForLicenseRedeem,
        serviceFeeBox,
      }) => {
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, ticketRedeemBoxForLicenseRedeem])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(ticketRedeemBoxForLicenseRedeem.assets[1])
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(boxFactory.chain.execute(transaction)).toBeTruthy();
      },
    );

    /**
     * @target should fail if service box doesn't have specified service nft
     * @scenario
     * - create service input & output boxes by invalid NFT
     * - execute transaction and burn ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      "should fail if service box doesn't have specified service nft",
      ({
        boxFactory,
        creator,
        serviceFeeBox,
        ticketRedeemBoxForLicenseRedeem,
      }) => {
        const serviceBox = boxFactory.createServiceBoxMock(
          creator.ergoTree,
          999_999_999n,
          undefined,
          undefined,
          undefined,
          undefined,
          // set invalid license-NFT id
          testUtils.TestConstants.X_TOKEN_ID,
        );
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.ergoTree,
          1_000_000_000n,
          undefined,
          undefined,
          undefined,
          undefined,
          // set invalid license-NFT id
          testUtils.TestConstants.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, ticketRedeemBoxForLicenseRedeem])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(ticketRedeemBoxForLicenseRedeem.assets[1])
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if service box license token is different from ticket redeem license
     * @scenario
     * - create service input & output boxes by different license token
     * - create extraLicenseToken that contains license token id same as service box license token
     * - execute transaction and burn ticket tokens and send extraLicenseToken Erg value to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if service box license token is different from ticket redeem license',
      ({
        boxFactory,
        creator,
        someoneWallet,
        serviceFeeBox,
        ticketRedeemBoxForLicenseRedeem,
      }) => {
        const serviceBox = boxFactory.createServiceBoxMock(
          creator.ergoTree,
          999_999_999n,
          undefined,
          undefined,
          undefined,
          testUtils.TestConstants.X_TOKEN_ID,
        );
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.ergoTree,
          1_000_000_000n,
          undefined,
          undefined,
          undefined,
          testUtils.TestConstants.X_TOKEN_ID,
        );

        const extraLicenseToken = mockUTxO({
          value: testUtils.TestConstants.FEE,
          ergoTree: constants.TRUE_SCRIPT_HEX,
          assets: [
            {
              tokenId: testUtils.TestConstants.X_TOKEN_ID,
              amount: 1n,
            },
          ],
        });

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([
            serviceBox,
            ticketRedeemBoxForLicenseRedeem,
            extraLicenseToken,
          ])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(ticketRedeemBoxForLicenseRedeem.assets[1])
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay box (service fee) Erg value is not correct
     * @scenario
     * - create serviceFeeBox by reduced erg value
     * - execute transaction and burn ticket tokens and send extra Ergs to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if safe pay box (service fee) Erg value is not correct',
      ({
        boxFactory,
        creator,
        someoneWallet,
        serviceBox,
        serviceOutputBox,
        ticketRedeemBoxForLicenseRedeem,
      }) => {
        const serviceFeeBox = boxFactory.createSafePayOutputBox(
          // put reduced value
          BigInt(ticketRedeemBoxForLicenseRedeem.value.toString()) -
            testUtils.TestConstants.FEE * 2n,
          [],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, ticketRedeemBoxForLicenseRedeem])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens(ticketRedeemBoxForLicenseRedeem.assets[1])
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay box (service fee) collecting token value is not correct
     * @scenario
     * - create serviceFeeBox by reduced collecting token value
     * - execute transaction and burn ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTokenGoalTest(
      'should fail if safe pay box (service fee) collecting token value is not correct',
      ({
        boxFactory,
        creator,
        serviceBox,
        serviceOutputBox,
        ticketRedeemBoxForLicenseRedeem,
      }) => {
        const serviceFeeBox = boxFactory.createSafePayOutputBox(
          BigInt(ticketRedeemBoxForLicenseRedeem.value.toString()) -
            testUtils.TestConstants.FEE,
          [
            {
              tokenId: ticketRedeemBoxForLicenseRedeem.assets[2].tokenId,
              // put reduced amount of collecting token
              amount: ticketRedeemBoxForLicenseRedeem.assets[2].amount - 1n,
            },
          ],
          blake2b256(Buffer.from(creator.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, ticketRedeemBoxForLicenseRedeem])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens([
            ticketRedeemBoxForLicenseRedeem.assets[1],
            {
              tokenId: ticketRedeemBoxForLicenseRedeem.assets[2].tokenId,
              amount: 1n,
            },
          ])
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if safe pay box (service fee) address hash differs from service fee address hash
     * @scenario
     * - create serviceFeeBox by invalid destination address
     * - execute transaction and burn ticket tokens
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if safe pay box (service fee) address hash differs from service fee address hash',
      ({
        boxFactory,
        someoneWallet,
        serviceBox,
        serviceOutputBox,
        ticketRedeemBoxForLicenseRedeem,
      }) => {
        const serviceFeeBox = boxFactory.createSafePayOutputBox(
          BigInt(ticketRedeemBoxForLicenseRedeem.value.toString()) -
            testUtils.TestConstants.FEE,
          [],
          // set different address
          blake2b256(Buffer.from(someoneWallet.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([serviceBox, ticketRedeemBoxForLicenseRedeem])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens([ticketRedeemBoxForLicenseRedeem.assets[1]])
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );

    /**
     * @target should fail if two ticket redeem boxes from two different raffles are spent in same tx
     * @scenario
     * - create two ticketRedeem boxes
     * - execute transaction and burn ticket tokens and send extra tokens to the someoneWallet address
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    ticketRedeemTest(
      'should fail if two ticket redeem boxes from two different raffles are spent in same tx',
      ({
        boxFactory,
        someoneWallet,
        serviceBox,
        serviceFeeBox,
        serviceOutputBox,
        ticketRedeemBoxForLicenseRedeem,
      }) => {
        const totalSoldTickets = 10n;
        const ticketPrice = testUtils.TestConstants.FEE * 2n;

        const ticketRedeemBoxForLicenseRedeem2 =
          boxFactory.createTicketRedeemBoxMock(
            testUtils.TestConstants.FEE * 3n,
            totalSoldTickets,
            ticketPrice,
            10n,
            testUtils.TestConstants.TICKET_TOKEN_ID,
            10n,
          );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([
            serviceBox,
            ticketRedeemBoxForLicenseRedeem,
            // put duplicated  ticketRedeemBox
            ticketRedeemBoxForLicenseRedeem2,
          ])
          .to([serviceOutputBox, serviceFeeBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.address)
          .burnTokens(ticketRedeemBoxForLicenseRedeem.assets[1])
          .payFee(testUtils.TestConstants.FEE)
          .build();

        expect(() => {
          boxFactory.chain.execute(transaction);
        }).toThrowError();
      },
    );
  });
});
