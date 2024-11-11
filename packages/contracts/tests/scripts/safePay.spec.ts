import { it, describe, expect } from 'vitest';
import { TransactionBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

import * as testUtils from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

const X_TOKEN_ID = '0001'.repeat(16);
const Y_TOKEN_ID = '0010'.repeat(16);

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 * @returns vitest customized "it" object
 */
const createSafePayTest = () => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'safePay',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { person1, person2 } = boxFactory.createPartners({
    person1: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
    person2: testUtils.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  person1.addBalance({
    tokens: [
      { tokenId: X_TOKEN_ID, amount: 100n },
      { tokenId: Y_TOKEN_ID, amount: 100n },
    ],
  });

  const safePayPureErg = boxFactory.createSafePayBoxMock(
    1_000_000_000n,
    [],
    blake2b256(Buffer.from(person2.ergoTree, 'hex')),
  );

  const safePayByOneToken = boxFactory.createSafePayBoxMock(
    1_000_000_000n,
    [
      {
        tokenId: X_TOKEN_ID,
        amount: 100n,
      },
    ],
    blake2b256(Buffer.from(person2.ergoTree, 'hex')),
  );

  const safePayByTwoToken = boxFactory.createSafePayBoxMock(
    1_000_000_000n,
    [
      {
        tokenId: X_TOKEN_ID,
        amount: 100n,
      },
      {
        tokenId: Y_TOKEN_ID,
        amount: 100n,
      },
    ],
    blake2b256(Buffer.from(person2.ergoTree, 'hex')),
  );

  // Created input box
  return it.extend({
    boxFactory: boxFactory,
    person1Wallet: person1,
    person2Wallet: person2,
    safePayPureErg: safePayPureErg,
    safePayByOneToken: safePayByOneToken,
    safePayByTwoToken: safePayByTwoToken,
  });
};

describe('safePay', () => {
  const raffleSafePayTestTest = createSafePayTest();

  describe('Sending funds to receiver address', () => {
    /**
     * @target should successfully withdraw erg from the safePay box
     * @scenario
     * - create safePay output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleSafePayTestTest(
      'should successfully withdraw erg from the safePay box',
      ({ boxFactory, person2Wallet, safePayPureErg }) => {
        const payOutputBox = boxFactory.createCustomOutputBox(
          1_000_000_000n - testUtils.FEE,
          [],
          person2Wallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([safePayPureErg])
          .to([payOutputBox])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);
        // Check execution result
        expect(res).true;
      },
    );

    /**
     * @target should successfully withdraw erg and all available tokens from the safePay box
     * @scenario
     * - create safePay output box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleSafePayTestTest(
      'should successfully withdraw erg and all available tokens from the safePay box',
      ({ boxFactory, person2Wallet, safePayByTwoToken }) => {
        const payOutputBox = boxFactory.createCustomOutputBox(
          1_000_000_000n - testUtils.FEE,
          [
            {
              tokenId: X_TOKEN_ID,
              amount: 100n,
            },
            {
              tokenId: Y_TOKEN_ID,
              amount: 100n,
            },
          ],
          person2Wallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([safePayByTwoToken])
          .to([payOutputBox])
          .payFee(testUtils.FEE)
          .build();

        const res = boxFactory.chain.execute(transaction);
        // Check execution result
        expect(res).true;
      },
    );

    /**
     * @target should fail if the erg value decreases in withdrawal transaction
     * @scenario
     * - create safePay output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleSafePayTestTest(
      'should fail if the erg value decreases in withdrawal transaction',
      ({ boxFactory, person1Wallet, person2Wallet, safePayPureErg }) => {
        const payOutputBox = boxFactory.createCustomOutputBox(
          // decrease extra value and put to another box
          1_000_000_000n - testUtils.FEE * 2n,
          [],
          person2Wallet.address.toString(),
        );

        const anotherPayOutputBox = boxFactory.createCustomOutputBox(
          // decrease extra value and put to another box
          testUtils.FEE,
          [],
          person1Wallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([safePayPureErg])
          .to([payOutputBox, anotherPayOutputBox])
          .payFee(testUtils.FEE)
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if the amount of one of tokens decreases in output
     * @scenario
     * - create safePay output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleSafePayTestTest(
      'should fail if the amount of one of tokens decreases in output',
      ({ boxFactory, person2Wallet, safePayByTwoToken }) => {
        const payOutputBox = boxFactory.createCustomOutputBox(
          1_000_000_000n - testUtils.FEE,
          [
            {
              tokenId: X_TOKEN_ID,
              amount: 99n,
            },
            {
              tokenId: Y_TOKEN_ID,
              amount: 100n,
            },
          ],
          person2Wallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([safePayByTwoToken])
          .to([payOutputBox])
          .payFee(testUtils.FEE)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens({
            tokenId: X_TOKEN_ID,
            amount: 1n,
          })
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if one of safePay tokens is missing in outputs
     * @scenario
     * - create safePay output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleSafePayTestTest(
      'should fail if one of safePay tokens is missing in outputs',
      ({ boxFactory, person2Wallet, safePayByTwoToken }) => {
        const payOutputBox = boxFactory.createCustomOutputBox(
          1_000_000_000n - testUtils.FEE,
          [
            {
              tokenId: X_TOKEN_ID,
              amount: 100n,
            },
          ],
          person2Wallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([safePayByTwoToken])
          .to([payOutputBox])
          .payFee(testUtils.FEE)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .burnTokens({
            tokenId: Y_TOKEN_ID,
            amount: 100n,
          })
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );

    /**
     * @target should fail if receiver address is different
     * @scenario
     * - create safePay output box
     * - execute transaction
     * - result of execution must be fail
     * @expected
     * - transaction result must throw error
     */
    raffleSafePayTestTest(
      'should fail if receiver address is different',
      ({ boxFactory, person1Wallet, safePayPureErg }) => {
        const payOutputBox = boxFactory.createCustomOutputBox(
          1_000_000_000n - testUtils.FEE,
          [],
          person1Wallet.address.toString(),
        );

        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from([safePayPureErg])
          .to([payOutputBox])
          .payFee(testUtils.FEE)
          .configureSelector((selector) => {
            selector.defineStrategy((inputs) => inputs);
          })
          .build();

        expect(() => boxFactory.chain.execute(transaction)).toThrowError();
      },
    );
  });
});
