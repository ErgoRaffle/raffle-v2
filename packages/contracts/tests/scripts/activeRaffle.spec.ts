import { it, describe, expect } from 'vitest';
import { TransactionBuilder, TokenAmount } from '@fleet-sdk/core';
import * as testUtils from '../testUtils';
import {
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - create activeRaffle input boxes
 *   - create raffleDetails input boxes
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
  const { creator, implementer, donator } = boxFactory.createPartners({
    creator: CREATOR_DEFAULT_BALANCE,
    implementer: UNKNOWN_WALLET_DEFAULT_BALANCE,
    donator: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  donator.addBalance({
    tokens: [{ tokenId: testUtils.X_TOKEN_ID, amount: 100n }],
  });

  // Created activeRaffle & raffleDetails input boxes
  const activeRaffleBox = boxFactory.createActiveRaffleBoxMock(
    creator.address.toString(),
    implementer.address.toString(),
    creator.address.toString(),
    winnersCount,
    400n,
    collectingToken,
    1_000_000n,
    1_000_000_000n,
    1_000n,
    0n,
  );
  const raffleDetailsBox = boxFactory.createRaffleDetailsBoxMock(
    testUtils.TICKET_TOKEN_ID,
  );

  return it.extend({
    boxFactory: boxFactory,
    donatorWallet: donator,
    implementerWallet: implementer,
    creatorWallet: creator,
    activeRaffleBox: activeRaffleBox,
    raffleDetailsBox: raffleDetailsBox,
  });
};

describe('ActiveRaffle', () => {
  const activeRaffleTest = createActiveRaffleTest(1n);
  const activeRaffleTokenGoalTest = createActiveRaffleTest(1n, {
    tokenId: testUtils.X_TOKEN_ID,
    amount: 10n,
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
          400n,
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
          400n,
          {
            tokenId: testUtils.X_TOKEN_ID,
            amount: 20n,
          },
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

        const result = boxFactory.chain.execute(transaction);

        expect(result).true;
      },
    );

    /**
     * @target should fail if the user receives more tickets than donated for erg-goal raffle
     * @scenario
     * - create activeRaffle & ticket output boxes
     * - execute transaction
     * - check execution done successfully
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
          400n,
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
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
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
          400n,
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
     * - check execution done successfully
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
          400n,
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
     * - check execution done successfully
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
          400n,
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
     * - check execution done successfully
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
          400n,
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
     * - check execution done successfully
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
          400n,
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
     * - check execution done successfully
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
          400n,
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
     * - check execution done successfully
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
          400n,
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
     * - check execution done successfully
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
          400n,
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
});
