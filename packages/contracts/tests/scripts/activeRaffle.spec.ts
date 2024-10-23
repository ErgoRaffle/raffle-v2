import { it, describe, expect } from 'vitest';
import { TransactionBuilder, TokenAmount } from '@fleet-sdk/core';
import * as testUtils from '../testUtils';
import {
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

const ARBITRARY_TOKEN_ID = '10'.repeat(32);

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - create activeRaffle input box
 *   - create raffleDetails input box
 *   - create oracle box
 *   - create service output box
 *   - create implementerFee output box
 * @returns vitest customized "it" object
 */
const createActiveRaffleTest = (
  winnersCount: bigint = 1n,
  collectingToken?: TokenAmount<bigint>,
) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 10 },
    constants.scriptList.filter(
      (value) => value != 'activeRaffle',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(11);

  const totalSoldTickets = 10n;
  const ticketPrice = 10n;
  const totalRaised = totalSoldTickets * ticketPrice;
  const serviceFeePercent = 20n;
  const implementerFeePercent = 10n;
  const charityFeePercent = 60n;
  const winnerPercent =
    100n - charityFeePercent - serviceFeePercent - implementerFeePercent;
  const totalPrize =
    (totalRaised *
      (100n - charityFeePercent - serviceFeePercent - implementerFeePercent)) /
    100n;

  const { creator, implementer, someone, donator } = boxFactory.createPartners({
    creator: CREATOR_DEFAULT_BALANCE,
    implementer: UNKNOWN_WALLET_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  donator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });
  someone.addBalance({
    tokens: [{ tokenId: ARBITRARY_TOKEN_ID, amount: 100n }],
  });

  // Created activeRaffle & raffleDetails input boxes
  const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
    creator.address.toString(),
    implementer.address.toString(),
    creator.address.toString(),
    winnersCount,
    40n,
    collectingToken,
    1_000_000n,
    1_000_000_000n,
    1_000n,
    0n,
  );
  const raffleDetailsBox = boxFactory.createRaffleDetailsBoxMock(
    testUtils.TICKET_TOKEN_ID,
  );

  const oracleBox = boxFactory.createMockedOracleUTxO(testUtils.FEE);
  const serviceFeeBox = boxFactory.createCustomOutputBox(
    collectingToken === undefined
      ? BigInt((totalRaised * serviceFeePercent) / 100n) + testUtils.FEE
      : testUtils.FEE,
    collectingToken === undefined
      ? []
      : [
          {
            tokenId: activeRaffleBox.assets[2].tokenId,
            amount: (totalRaised * serviceFeePercent) / 100n,
          },
        ],
    someone.address.toString(),
  );
  const implementerFeeBox = boxFactory.createCustomOutputBox(
    collectingToken === undefined
      ? BigInt((totalRaised * implementerFeePercent) / 100n) + testUtils.FEE
      : testUtils.FEE,
    collectingToken === undefined
      ? []
      : [
          {
            tokenId: activeRaffleBox.assets[2].tokenId,
            amount: (totalRaised * implementerFeePercent) / 100n,
          },
        ],
    implementer.address.toString(),
  );

  return it.extend({
    boxFactory: boxFactory,
    donatorWallet: donator,
    creatorWallet: creator,
    implementerWallet: implementer,
    someoneWallet: someone,
    activeRaffleBox: activeRaffleBox,
    raffleDetailsBox: raffleDetailsBox,
    winnerPercent: winnerPercent,
    totalPrize: totalPrize,
    totalRaised,
    oracleBox: oracleBox,
    serviceFeeBox: serviceFeeBox,
    implementerFeeBox: implementerFeeBox,
  });
};

describe('ActiveRaffle', () => {
  const activeRaffleTest = createActiveRaffleTest(1n);
  const activeRaffleTokenGoalTest = createActiveRaffleTest(1n, {
    tokenId: testUtils.X_TOKEN_ID,
    amount: 1n,
  });

  describe('Donation', () => {
    /**
     * @target should successfully donate to erg-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    activeRaffleTest(
      'should successfully donate to erg-goal raffle',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_050n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 5n,
          undefined,
          5n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          5n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 5n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );

    /**
     * @target should successfully donate to token-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    activeRaffleTokenGoalTest(
      'should successfully donate to token-goal raffle',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: 51n,
          },
          1_000_000n,
          1_000_000_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 5n,
          undefined,
          5n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          5n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 5n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );

    /**
     * @target should fail if the user receives more tickets than donated for erg-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if the user receives more tickets than donated for erg-goal raffle',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_010n,
          // decrease extra ticket-tokens
          BigInt(activeRaffleBox.assets[1].amount) - 15n,
          undefined,
          1n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          15n, // add extra ticket tokens to the ticket-box
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if the user receives more tickets than donated for token-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTokenGoalTest(
      'should fail if the user receives more tickets than donated for token-goal raffle',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: 20n,
          },
          1_000_000n,
          1_000_000_010n,
          // decrease extra ticket-tokens
          BigInt(activeRaffleBox.assets[1].amount) - 15n,
          undefined,
          1n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          15n, // add extra ticket tokens to the ticket-box
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if any value in the R4 register altered
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if any value in the R4 register altered',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_010n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 1n,
          undefined,
          1n,
          0n, // set incorrect deadline value
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if any value in the R5 register altered
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if any value in the R5 register altered',
      ({ boxFactory, creatorWallet, donatorWallet, activeRaffleBox }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          'invalid implementer address',
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_010n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if the total sold tickets in an active raffle is not correctly updated
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if the total sold tickets in an active raffle is not correctly updated',
      ({
        boxFactory,
        creatorWallet,
        donatorWallet,
        implementerWallet,
        activeRaffleBox,
      }) => {
        donatorWallet.addBalance({
          tokens: [
            {
              tokenId: testUtils.TICKET_TOKEN_ID,
              amount: 1n,
            },
          ],
        });
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_010n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 1n,
          undefined,
          // set incorrect sold-tickets amount
          2n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if token-goal active raffle box value decreases
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTokenGoalTest(
      'should fail if token-goal active raffle box value decreases',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: 20n,
          },
          1_000_000n,
          900_000_000n, // decrease box value
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if an arbitrary token is added to erg-goal active raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if an arbitrary token is added to erg-goal active raffle',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_010n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
          // add extra tokens to the output activeRaffle box
          [
            {
              tokenId: testUtils.X_TOKEN_ID,
              amount: 1n,
            },
          ],
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if an arbitrary token is used in ticket box
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if an arbitrary token is used in ticket box',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_010n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          1n,
          testUtils.X_TOKEN_ID,
          [0n, 1n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if ticket range is not valid
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if ticket range is not valid',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        donatorWallet,
        activeRaffleBox,
      }) => {
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          40n,
          undefined,
          1_000_000n,
          1_000_000_010n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBox.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.address.toString(),
          1n,
          testUtils.TICKET_TOKEN_ID,
          // set invalid tickets range
          [0n, 2n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.address.toString())
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });

  describe('Successful end', () => {
    /**
     * @target should successfully finalize an erg-goal raffle and split the raised fund
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    activeRaffleTest(
      'should successfully finalize an erg-goal raffle and split the raised fund',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const serviceFeePercent = 20n;
        const totalSoldTickets = 10n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        const result = boxFactory.chain.execute(transaction);
        expect(result).true;
      },
    );

    /**
     * @target should successfully finalize an token-goal raffle and split the raised fund
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    activeRaffleTokenGoalTest(
      'should successfully finalize an token-goal raffle and split the raised fund',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        totalPrize,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 10n;
        const ticketPrice = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          serviceFeePercent,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: totalSoldTickets * ticketPrice + 1n,
          },
          1_000_000n,
          1_000_000_000n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
          testUtils.X_TOKEN_ID,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        const result = boxFactory.chain.execute(transaction);
        expect(result).true;
      },
    );

    /**
     * @target should fail with an invalid nft-id of oracle box
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail with an invalid nft-id of oracle box',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const oracleBox = boxFactory.createMockedOracleUTxO(
          testUtils.FEE,
          // set invalid oracle token id
          testUtils.X_TOKEN_ID,
        );
        const winnersCount = 1;
        const totalSoldTickets = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail with an invalid creation-height of oracle box
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail with an invalid creation-height of oracle box',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const oracleBox = boxFactory.createMockedOracleUTxO(
          testUtils.FEE,
          undefined,
          // set invalid creation-height
          50,
        );
        const winnersCount = 1;
        const totalSoldTickets = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if an arbitrary token is added to erg-goal success raffle
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if an arbitrary token is added to erg-goal success raffle',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        someoneWallet,
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const serviceFeePercent = 20n;
        const totalSoldTickets = 10n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
          undefined,
          // add arbitrary token
          [
            {
              tokenId: ARBITRARY_TOKEN_ID,
              amount: 10n,
            },
          ],
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox, ...someoneWallet.utxos])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail with invalid total prize in success raffle R4 register
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail with invalid total prize in success raffle R4 register',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const serviceFeePercent = 20n;
        const totalSoldTickets = 10n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          // set invalid totalPrize
          0n,
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if split the raised erg incorrectly
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if split the raised erg incorrectly',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        someoneWallet,
        raffleDetailsBox,
        oracleBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 10n;
        // set invalid percents on the output fee boxes
        const invalidServiceFeePercent = 25n;
        const invalidImplementerFeePercent = 5n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          invalidServiceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const serviceFeeBox = boxFactory.createCustomOutputBox(
          BigInt((totalRaised * invalidServiceFeePercent) / 100n) +
            testUtils.FEE,
          [],
          someoneWallet.address.toString(),
        );

        const implementerFeeBox = boxFactory.createCustomOutputBox(
          BigInt((totalRaised * invalidImplementerFeePercent) / 100n) +
            testUtils.FEE,
          [],
          implementerWallet.address.toString(),
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if split the raised token incorrectly
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTokenGoalTest(
      'should fail if split the raised token incorrectly',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        someoneWallet,
        raffleDetailsBox,
        oracleBox,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 10n;
        const ticketPrice = 10n;
        // set invalid percents on the output fee boxes
        const invalidServiceFeePercent = 25n;
        const invalidImplementerFeePercent = 5n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          invalidServiceFeePercent,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: totalSoldTickets * ticketPrice + 1n,
          },
          1_000_000n,
          1_000_000_000n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const serviceFeeBox = boxFactory.createCustomOutputBox(
          testUtils.FEE,
          [
            {
              tokenId: activeRaffleBox.assets[2].tokenId,
              amount: (totalRaised * invalidServiceFeePercent) / 100n,
            },
          ],
          someoneWallet.address.toString(),
        );

        const implementerFeeBox = boxFactory.createCustomOutputBox(
          testUtils.FEE,
          [
            {
              tokenId: activeRaffleBox.assets[2].tokenId,
              amount: (totalRaised * invalidImplementerFeePercent) / 100n,
            },
          ],
          implementerWallet.address.toString(),
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
          testUtils.X_TOKEN_ID,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if seed in the success raffle R5 register is incorrect
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if seed in the success raffle R5 register is incorrect',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        oracleBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          // set invalid seed
          'invalid seed',
          [],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if selected winner list in the success raffle R5 register is incorrect
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if selected winner list in the success raffle R5 register is incorrect',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        oracleBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          // set invalid selected winner list
          [0n],
          totalSoldTickets,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if step is incorrect in success raffle R6 register
     * @scenario
     * - create activeRaffle & successRaffle output boxes
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if step is incorrect in success raffle R6 register',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        oracleBox,
        winnerPercent,
        totalPrize,
        totalRaised,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_100n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt((totalRaised * winnerPercent) / 100n) + testUtils.FEE,
          activeRaffleBox.assets[0].tokenId,
          oracleBox.boxId.toString(),
          [],
          // set invalid totalSoldTickets to the R6
          totalSoldTickets - 1n,
          BigInt(winnersCount),
          BigInt(totalPrize),
          BigInt(totalPrize) + 1n,
          1n,
          activeRaffleBox.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBox.assets[1].amount) + 1n,
        );

        const creatorFundBox = testUtils.createChangeBox(
          [activeRaffleBox, raffleDetailsBox],
          [successRaffleOutputBox, serviceFeeBox, implementerFeeBox],
          testUtils.FEE,
          creatorWallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([
            successRaffleOutputBox,
            creatorFundBox,
            serviceFeeBox,
            implementerFeeBox,
          ])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(creatorWallet.address.toString())
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });

  describe('Failure end', () => {
    /**
     * @target should successfully finalize a failed erg-goal raffle
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    activeRaffleTest(
      'should successfully finalize a failed erg-goal raffle',
      ({ boxFactory, creatorWallet, implementerWallet, raffleDetailsBox }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1n;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_080n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBox.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          1n,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBox.assets[1].amount.toString()) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([giftRedeemOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        const result = boxFactory.chain.execute(transaction);
        expect(result).true;
      },
    );

    /**
     * @target should successfully finalize a failed token-goal raffle
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    activeRaffleTokenGoalTest(
      'should successfully finalize a failed token-goal raffle',
      ({ boxFactory, creatorWallet, implementerWallet, raffleDetailsBox }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1n;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          1n,
          serviceFeePercent,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: totalSoldTickets * ticketPrice + 1n,
          },
          1_000_000n,
          1_000_000_000n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBox.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          1n,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBox.assets[1].amount.toString()) + 1n,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: totalSoldTickets * ticketPrice + 1n,
          },
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([giftRedeemOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        const result = boxFactory.chain.execute(transaction);
        expect(result).true;
      },
    );

    /**
     * @target should fail if an arbitrary token is added to gift redeem
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if an arbitrary token is added to gift redeem',
      ({
        boxFactory,
        creatorWallet,
        implementerWallet,
        someoneWallet,
        raffleDetailsBox,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1n;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_080n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBox.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          1n,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBox.assets[1].amount.toString()) + 1n,
          undefined,
          // Add invalid arbitrary token
          [
            {
              tokenId: ARBITRARY_TOKEN_ID,
              amount: 1n,
            },
          ],
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox, ...someoneWallet.utxos])
          .to([giftRedeemOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .sendChangeTo(someoneWallet.address)
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if any value in the R4 register is invalid
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if any value in the R4 register is invalid',
      ({ boxFactory, creatorWallet, implementerWallet, raffleDetailsBox }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1n;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_080n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBox.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          // set invalid totalSoldTickets value to the R4
          totalSoldTickets - 3n,
          ticketPrice,
          winnersCount,
          1n,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBox.assets[1].amount.toString()) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([giftRedeemOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if step in the R5 register of gift redeem is invalid
     * @scenario
     * - create giftRedeem output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    activeRaffleTest(
      'should fail if step in the R5 register of gift redeem is invalid',
      ({ boxFactory, creatorWallet, implementerWallet, raffleDetailsBox }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1n;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;
        const serviceFeePercent = 20n;

        const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
          creatorWallet.address.toString(),
          implementerWallet.address.toString(),
          creatorWallet.address.toString(),
          BigInt(winnersCount),
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_000_080n,
          1_000n,
          totalSoldTickets,
          100n,
        );

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBox.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          // set invalid step number to the R5
          -1n,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBox.assets[1].amount.toString()) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBox, raffleDetailsBox])
          .to([giftRedeemOutputBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
