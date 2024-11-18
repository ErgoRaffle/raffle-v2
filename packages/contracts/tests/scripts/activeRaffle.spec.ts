import { it, describe, expect } from 'vitest';
import { TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { SColl, SByte } from '@fleet-sdk/serializer';
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
const createActiveRaffleEndTest = (
  winnersCount: number = 1,
  collectingTokenId?: string,
) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 10 },
    constants.scriptList.filter(
      (value) => value != 'activeRaffle',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(11);

  const totalSuccessSoldTickets = 1000n;
  const ticketPrice = collectingTokenId === undefined ? 100_000n : 10n;
  const totalRaised = totalSuccessSoldTickets * ticketPrice;
  const goal = totalSuccessSoldTickets * ticketPrice;
  const collectingTokenForSuccess =
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: totalRaised + 1n,
        }
      : undefined;
  const implementerFeePercent = 100n;
  const serviceFeePercent = 200n;

  const { creator, implementer, someone, donator } = boxFactory.createPartners({
    creator: CREATOR_DEFAULT_BALANCE,
    implementer: UNKNOWN_WALLET_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  donator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 1_000n }],
  });
  someone.addBalance({
    tokens: [{ tokenId: ARBITRARY_TOKEN_ID, amount: 1_000n }],
  });

  // Created activeRaffle & raffleDetails input boxes
  const activeRaffleBoxForDonate = boxFactory.createActiveRaffleBoxMock(
    creator.ergoTree,
    implementer.ergoTree,
    creator.ergoTree,
    winnersCount,
    serviceFeePercent,
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: 1n,
        }
      : undefined,
    1_000_000n,
    1_000_000_000n,
    1_000n,
    0n,
    undefined,
    ticketPrice,
  );

  activeRaffleBoxForDonate.setContextExtension({
    0: SColl(SByte, Array.from(Buffer.from(donator.ergoTree, 'hex'))),
  });

  const activeRaffleBoxForSuccessEnd = boxFactory.createActiveRaffleBoxMock(
    creator.ergoTree,
    implementer.ergoTree,
    creator.ergoTree,
    winnersCount,
    serviceFeePercent,
    collectingTokenForSuccess,
    1_000_000n,
    1_001_000_000n,
    1_000n,
    totalSuccessSoldTickets,
    goal,
    ticketPrice,
  );

  const activeRaffleBoxForFailureEnd = boxFactory.createActiveRaffleBoxMock(
    creator.ergoTree,
    implementer.ergoTree,
    creator.ergoTree,
    winnersCount,
    serviceFeePercent,
    collectingTokenId !== undefined
      ? {
          tokenId: collectingTokenId,
          amount: 81n,
        }
      : undefined,
    1_000_000n,
    1_000_000_000n,
    1_000n,
    8n,
    goal,
    ticketPrice,
  );

  const raffleDetailsBox = boxFactory.createRaffleDetailsBoxMock(
    testUtils.TICKET_TOKEN_ID,
  );

  const giftRedeemOutputBoxForFailureEnd = boxFactory.createGiftRedeemOutputBox(
    BigInt(activeRaffleBoxForFailureEnd.value) +
      BigInt(raffleDetailsBox.value) -
      testUtils.FEE,
    8n,
    ticketPrice,
    winnersCount,
    1,
    testUtils.TICKET_TOKEN_ID,
    // added by one token on the raffle-details box
    BigInt(activeRaffleBoxForFailureEnd.assets[1].amount.toString()) + 1n,
    collectingTokenId !== undefined
      ? {
          tokenId: testUtils.X_TOKEN_ID,
          amount: 8n * ticketPrice + 1n,
        }
      : undefined,
  );

  const oracleBox = boxFactory.createMockedOracleUTxO(testUtils.FEE);
  const serviceFeeBox = boxFactory.createSafePayOutputBox(
    collectingTokenId === undefined
      ? BigInt((totalRaised * serviceFeePercent) / 1000n) + 2n * testUtils.FEE
      : 2n * testUtils.FEE,
    collectingTokenId === undefined
      ? []
      : [
          {
            tokenId: collectingTokenId,
            amount: (totalRaised * serviceFeePercent) / 1000n,
          },
        ],
    blake2b256(Buffer.from(creator.ergoTree, 'hex')),
  );
  const implementerFeeBox = boxFactory.createSafePayOutputBox(
    collectingTokenId === undefined
      ? BigInt((totalRaised * implementerFeePercent) / 1000n) +
          2n * testUtils.FEE
      : 2n * testUtils.FEE,
    collectingTokenId === undefined
      ? []
      : [
          {
            tokenId: collectingTokenId,
            amount: (totalRaised * implementerFeePercent) / 1000n,
          },
        ],
    blake2b256(Buffer.from(implementer.ergoTree, 'hex')),
  );

  return it.extend({
    boxFactory: boxFactory,
    donatorWallet: donator,
    creatorWallet: creator,
    implementerWallet: implementer,
    someoneWallet: someone,
    activeRaffleBoxForDonate: activeRaffleBoxForDonate,
    activeRaffleBoxForSuccessEnd: activeRaffleBoxForSuccessEnd,
    activeRaffleBoxForFailureEnd: activeRaffleBoxForFailureEnd,
    giftRedeemOutputBoxForFailureEnd: giftRedeemOutputBoxForFailureEnd,
    raffleDetailsBox: raffleDetailsBox,
    oracleBox: oracleBox,
    serviceFeeBox: serviceFeeBox,
    implementerFeeBox: implementerFeeBox,
  });
};

describe('ActiveRaffle', () => {
  const activeRaffleTest = createActiveRaffleEndTest(1);
  const activeRaffleTokenGoalTest = createActiveRaffleEndTest(
    1,
    testUtils.X_TOKEN_ID,
  );

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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;

        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_500_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 5n,
          undefined,
          5n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          5n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 5n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: 51n,
          },
          1_000_000n,
          1_000_000_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 5n,
          undefined,
          5n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          5n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 5n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_001_400_000n,
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 14n,
          undefined,
          14n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          14n,
          testUtils.TICKET_TOKEN_ID,
          // put extra range to the output ticket box
          [0n, 15n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: 141n,
          },
          1_000_000n,
          1_000_000_000n,
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 14n,
          undefined,
          14n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          14n,
          testUtils.TICKET_TOKEN_ID,
          // put extra range to the output ticket box
          [0n, 15n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 1n,
          undefined,
          1n,
          0n, // set incorrect deadline value
          undefined,
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
      ({
        boxFactory,
        creatorWallet,
        donatorWallet,
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          'invalid implementer address',
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        donatorWallet.addBalance({
          tokens: [
            {
              tokenId: testUtils.TICKET_TOKEN_ID,
              amount: 1n,
            },
          ],
        });
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 1n,
          undefined,
          // set incorrect sold-tickets amount
          2n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          {
            tokenId: testUtils.X_TOKEN_ID,
            // move one lower amount of tokens
            amount: 21n,
          },
          1_000_000n,
          999_999_999n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 2n,
          undefined,
          2n,
          1000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          2n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 2n, 10n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 1n,
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
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          1n,
          testUtils.TICKET_TOKEN_ID,
          [0n, 1n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          1n,
          // put invalid ticket token id
          testUtils.X_TOKEN_ID,
          [0n, 1n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        activeRaffleBoxForDonate,
      }) => {
        const serviceFeePercent = 200n;
        const activeRaffleOutputBox = boxFactory.createActiveRaffleOutputBox(
          creatorWallet.ergoTree,
          implementerWallet.ergoTree,
          creatorWallet.ergoTree,
          1,
          serviceFeePercent,
          undefined,
          1_000_000n,
          1_000_100_000n,
          // one ticket-token move to the ticket box
          BigInt(activeRaffleBoxForDonate.assets[1].amount) - 1n,
          undefined,
          1n,
          1000n,
          undefined,
          undefined,
          100_000n,
        );
        const ticketOutputBox = boxFactory.createTicketOutputBox(
          donatorWallet.ergoTree,
          1n,
          testUtils.TICKET_TOKEN_ID,
          // set invalid tickets range
          [0n, 2n, 100_000n], // from-ticket-range, to-ticket-range, ticket-price
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForDonate, ...donatorWallet.utxos])
          .to([activeRaffleOutputBox, ticketOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(donatorWallet.ergoTree)
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
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
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
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const totalPrize = 2000n;
        const remainingFund = 7000n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(activeRaffleBoxForSuccessEnd.value.toString()) -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          remainingFund + 1n,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
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
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);
        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const totalFeePercent = 300n;

        const oracleBox = boxFactory.createMockedOracleUTxO(
          testUtils.FEE,
          // set invalid oracle token id
          testUtils.X_TOKEN_ID,
        );
        const winnersCount = 1;
        const totalSoldTickets = 1000n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const totalFeePercent = 300n;

        const oracleBox = boxFactory.createMockedOracleUTxO(
          testUtils.FEE,
          undefined,
          // set invalid creation-height
          50,
        );
        const winnersCount = 1;
        const totalSoldTickets = 1000n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
        someoneWallet,
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
          undefined,
          // add arbitrary token
          [
            {
              tokenId: ARBITRARY_TOKEN_ID,
              amount: 10n,
            },
          ],
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([
            activeRaffleBoxForSuccessEnd,
            raffleDetailsBox,
            ...someoneWallet.utxos,
          ])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
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
        raffleDetailsBox,
        oracleBox,
        serviceFeeBox,
        implementerFeeBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          // set invalid totalPrize
          totalPrize - 1n,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
        raffleDetailsBox,
        oracleBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;

        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        // set invalid percents on the output fee boxes
        const invalidServiceFeePercent = 250n;
        const invalidImplementerFeePercent = 50n;
        const totalFeePercent =
          invalidImplementerFeePercent + invalidServiceFeePercent;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const serviceFeeBox = boxFactory.createSafePayOutputBox(
          BigInt((totalRaised * invalidServiceFeePercent) / 1000n) +
            testUtils.FEE * 2n,
          [],
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
        );

        const implementerFeeBox = boxFactory.createSafePayOutputBox(
          BigInt((totalRaised * invalidImplementerFeePercent) / 1000n) +
            testUtils.FEE * 2n,
          [],
          blake2b256(Buffer.from(implementerWallet.ergoTree, 'hex')),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
        raffleDetailsBox,
        oracleBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const totalRaised = 10_000n;
        const totalPrize = 2000n;
        const remainingFund = 7000n;
        // set invalid percents on the output fee boxes
        const invalidServiceFeePercent = 250n;
        const invalidImplementerFeePercent = 50n;

        const serviceFeeBox = boxFactory.createSafePayOutputBox(
          2n * testUtils.FEE,
          [
            {
              tokenId: activeRaffleBoxForSuccessEnd.assets[2].tokenId,
              amount: (totalRaised * invalidServiceFeePercent) / 1000n,
            },
          ],
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
        );

        const implementerFeeBox = boxFactory.createSafePayOutputBox(
          2n * testUtils.FEE,
          [
            {
              tokenId: activeRaffleBoxForSuccessEnd.assets[2].tokenId,
              amount: (totalRaised * invalidImplementerFeePercent) / 1000n,
            },
          ],
          blake2b256(Buffer.from(implementerWallet.ergoTree, 'hex')),
        );

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          BigInt(activeRaffleBoxForSuccessEnd.value.toString()) -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          remainingFund + 1n,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
          testUtils.X_TOKEN_ID,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        oracleBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          // set invalid seed
          'invalid seed',
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        oracleBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          // set invalid selected winner list
          [0n],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          1,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
        raffleDetailsBox,
        serviceFeeBox,
        implementerFeeBox,
        oracleBox,
        activeRaffleBoxForSuccessEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 1000n;
        const winnersPercent = 200n;
        const totalRaised = 100_000_000n;
        const totalPrize = (winnersPercent * totalRaised) / 1000n;
        const totalFeePercent = 300n;

        const successRaffleOutputBox = boxFactory.createSuccessRaffleBox(
          activeRaffleBoxForSuccessEnd.value -
            (totalRaised * totalFeePercent) / 1000n -
            testUtils.FEE * 4n,
          activeRaffleBoxForSuccessEnd.assets[0].tokenId,
          oracleBox.boxId.toString(),
          blake2b256(Buffer.from(creatorWallet.ergoTree, 'hex')),
          [],
          totalSoldTickets,
          winnersCount,
          totalPrize,
          undefined,
          // set invalid step number to the R6
          2,
          activeRaffleBoxForSuccessEnd.assets[1].tokenId,
          // plus one token that exists on the Raffle-Details box
          BigInt(activeRaffleBoxForSuccessEnd.assets[1].amount) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForSuccessEnd, raffleDetailsBox])
          .to([successRaffleOutputBox, serviceFeeBox, implementerFeeBox])
          .withDataFrom([oracleBox])
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
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
      ({
        boxFactory,
        raffleDetailsBox,
        activeRaffleBoxForFailureEnd,
        giftRedeemOutputBoxForFailureEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForFailureEnd, raffleDetailsBox])
          .to([giftRedeemOutputBoxForFailureEnd])
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
      ({
        boxFactory,
        raffleDetailsBox,
        activeRaffleBoxForFailureEnd,
        giftRedeemOutputBoxForFailureEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForFailureEnd, raffleDetailsBox])
          .to([giftRedeemOutputBoxForFailureEnd])
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
        someoneWallet,
        raffleDetailsBox,
        activeRaffleBoxForFailureEnd,
      }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBoxForFailureEnd.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          1,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBoxForFailureEnd.assets[1].amount.toString()) + 1n,
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
          .from([
            activeRaffleBoxForFailureEnd,
            raffleDetailsBox,
            ...someoneWallet.utxos,
          ])
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
      ({ boxFactory, raffleDetailsBox, activeRaffleBoxForFailureEnd }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBoxForFailureEnd.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          // set invalid totalSoldTickets value to the R4
          totalSoldTickets - 1n,
          ticketPrice,
          winnersCount,
          1,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBoxForFailureEnd.assets[1].amount.toString()) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForFailureEnd, raffleDetailsBox])
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
      ({ boxFactory, raffleDetailsBox, activeRaffleBoxForFailureEnd }) => {
        boxFactory.chain.setTip(2001);

        const winnersCount = 1;
        const totalSoldTickets = 8n;
        const ticketPrice = 10n;

        const giftRedeemOutputBox = boxFactory.createGiftRedeemOutputBox(
          BigInt(activeRaffleBoxForFailureEnd.value) +
            BigInt(raffleDetailsBox.value) -
            testUtils.FEE,
          totalSoldTickets,
          ticketPrice,
          winnersCount,
          // set invalid step number to the R5
          2,
          testUtils.TICKET_TOKEN_ID,
          // added by one token on the raffle-details box
          BigInt(activeRaffleBoxForFailureEnd.assets[1].amount.toString()) + 1n,
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([activeRaffleBoxForFailureEnd, raffleDetailsBox])
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
