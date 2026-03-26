import {
  TransactionBuilder,
  OutputBuilder,
  ErgoUnsignedInput,
} from '@fleet-sdk/core';
import { KeyedMockChainParty, mockUTxO } from '@fleet-sdk/mock-chain';
import { SColl, SInt, SLong, SByte } from '@fleet-sdk/serializer';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

interface InactiveRaffleTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  someoneWallet: KeyedMockChainParty;
  project: KeyedMockChainParty;
  ticketRepoInputBox: ErgoUnsignedInput;
  inactiveRaffleInputBox: ErgoUnsignedInput;
}

interface TestInterface {
  inactiveRaffleBy1WinnerTestRequirements: InactiveRaffleTestInterface;
  inactiveRaffleBy5WinnerTestRequirements: InactiveRaffleTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock chain and partners
 *   - compile contracts
 *   - create inactiveRaffle input box
 *   - create ticketRepo input box
 * @returns object
 */
const provideInactiveRaffleTestRequirements = (winnersCount: number = 1) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'inactiveRaffle',
    ) as ScriptNamesType[],
  );
  const { project, someone } = boxFactory.createPartners({
    project: testUtils.TestConstants.ORGANIZER_DEFAULT_BALANCE,
    someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });

  const ticketRepoInputBox = boxFactory.createTicketRepoBoxMock();
  const inactiveRaffleInputBox = boxFactory.createInactiveRaffleBoxMock(
    project.ergoTree,
    someone.ergoTree,
    project.ergoTree,
    winnersCount,
  );

  return {
    boxFactory: boxFactory,
    someoneWallet: someone,
    project: project,
    ticketRepoInputBox: ticketRepoInputBox,
    inactiveRaffleInputBox: inactiveRaffleInputBox,
  };
};

describe('inactiveRaffle', () => {
  beforeEach<TestInterface>((ctx) => {
    ctx.inactiveRaffleBy1WinnerTestRequirements =
      provideInactiveRaffleTestRequirements();
    ctx.inactiveRaffleBy5WinnerTestRequirements =
      provideInactiveRaffleTestRequirements(5);
  });

  describe('Active raffle creation', () => {
    /**
     * @target inactive-raffle should create active raffle by 1 winner successfully
     * @scenario
     * - create three output boxes by valid values and one winner box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should create active raffle by 1 winner successfully', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      const winnersBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      const res =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          {
            signers: [inactiveRaffleBy1WinnerTestRequirements.project],
          },
        );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target inactive-raffle should create active raffle by 5 winner
     * @scenario
     * - create three output boxes by valid values and 5 winners boxes
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should create active raffle by 5 winner', ({
      inactiveRaffleBy5WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy5WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy5WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy5WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy5WinnerTestRequirements.project.ergoTree,
          5,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy5WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy5WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          5,
        );
      const transaction = new TransactionBuilder(
        inactiveRaffleBy5WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy5WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy5WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy5WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            5,
            inactiveRaffleBy5WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy5WinnerTestRequirements.project.address)
        .build();

      const res =
        inactiveRaffleBy5WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          {
            signers: [inactiveRaffleBy5WinnerTestRequirements.project],
          },
        );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target inactive-raffle should create active raffle by 1 winner and X token-goal
     * @scenario
     * - create three output boxes by valid values and one winner box
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should create active raffle by 1 winner and X token-goal', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const inactiveRaffleInputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createInactiveRaffleBoxMock(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
          { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1n },
        );
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
          undefined,
          { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1n },
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      const winnersBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      const res =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          {
            signers: [inactiveRaffleBy1WinnerTestRequirements.project],
          },
        );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by missed license-token
     * @scenario
     * - create three output boxes by valid values and one winner box(remove license-token from active box and added to gift box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create token by missed license-token', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );

      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // remove license token
      activeRaffleOutputBox.assets.remove(
        testUtils.TestConstants.LICENSE_TOKEN_ID,
      );
      giftTokenRepoOutputBox.assets.add({
        tokenId: testUtils.TestConstants.LICENSE_TOKEN_ID,
        amount: 1n,
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong ticket token
     * @scenario
     * - create three output boxes by valid values and one winner box(move one ticket token from active box to gift box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong ticket token', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );

      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      const winnerBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );

      // Move one ticket token from Active-Raffle box to the Gift-Token-Repo Box
      activeRaffleOutputBox.assets.at(1).amount =
        activeRaffleOutputBox.assets.at(1).amount - 1n;
      giftTokenRepoOutputBox.addTokens({
        tokenId: activeRaffleOutputBox.assets.at(1).tokenId as string,
        amount: 1n,
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnerBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong R4 of active raffle
     * @scenario
     * - create three output boxes by valid values and one winner box(set invalid value on the R4 of active box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create by wrong R4 of active raffle', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Set invalid value as R4 data
      activeRaffleOutputBox.setAdditionalRegisters({
        R4: SColl(SLong, [5n, 6n]).toHex(),
        R5: SColl(SColl(SByte), [
          Array.from(
            Buffer.from(
              (
                inactiveRaffleBy1WinnerTestRequirements.boxFactory
                  .contractsAddresses as { [k: string]: string }
              )['service'],
              'hex',
            ),
          ),
          Array.from(
            Buffer.from(
              inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
            ),
          ),
          Array.from(
            Buffer.from(
              inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
            ),
          ),
        ]),
        R6: SColl(SLong, [0n]).toHex(),
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong R5 of active raffle
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong R5 value on the active raffle box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create by wrong R5 of active raffle', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // replace invalid R5 value of the Active-Raffle box
      activeRaffleOutputBox.setAdditionalRegisters({
        R4: SColl(SLong, [
          200n, // WinnersPercent,
          100n, // ServiceFeePercent,
          100n, // ImplementerFeePercent,
          10n, // TicketPrice,
          1000n, // Goal,
          0n, // Deadline,
          1n, // WinnersCount,
          testUtils.TestConstants.FEE, // TxFee
        ]).toHex(),
        R5: SColl(SLong, [5n, 6n]).toHex(),
        R6: SColl(SLong, [0n]).toHex(),
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong value of active raffle
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong value of active raffle box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create by wrong value of active raffle', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Set invalid value for the active-raffle box
      activeRaffleOutputBox.setValue(150_000n);

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong collecting token on the active-box
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong collecting token on the active-box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong collecting token on the inactive-box', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      // Set collecting token as X-Token that not found on the Inactive-Raffle Box
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
          undefined,
          { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1n }, // set collecting token
        );
      const extraInputBox = mockUTxO({
        ergoTree: inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        value: 11_000_000n,
        creationHeight: 4,
        assets: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1n }],
      });
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
          extraInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong collecting token on the inactive-box
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong collecting token on the inactive-box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong collecting token on the active-box', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const inactiveRaffleInputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createInactiveRaffleBoxMock(
          inactiveRaffleBy1WinnerTestRequirements.boxFactory.contractsAddresses[
            'service'
          ],
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
          { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1n }, // Set collecting token as X-Token that missed on the active box
        );

      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      // added X-Token to the gift box to prevent burn token error raising
      giftTokenRepoOutputBox.addTokens({
        tokenId: testUtils.TestConstants.X_TOKEN_ID,
        amount: 1n,
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong winner box percentage
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong winner box percentage)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong winner box percentage', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      const winnersBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );

      // Set winner box wrong percentage on the R4 second cell
      winnersBoxes[0].setAdditionalRegisters({
        R4: SColl(SLong, [BigInt(1), 2000n, 0n, testUtils.TestConstants.FEE]),
      });
      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong winner box index
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong winner box index)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong winner box index', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      const winnersBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );

      // Set winner box wrong index on the R4 first cell
      winnersBoxes[0].setAdditionalRegisters({
        R4: SColl(SLong, [BigInt(43), 1000n, 0n, testUtils.TestConstants.FEE]),
      });
      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong winner box ticket-token
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong winner box ticket-token)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong winner box ticket-token', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const inactiveRaffleInputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createInactiveRaffleBoxMock(
          inactiveRaffleBy1WinnerTestRequirements.boxFactory.contractsAddresses[
            'service'
          ],
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
          { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1n },
        );
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      const winnersBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );

      // Replace wrong ticket-token data
      winnersBoxes[0].assets.remove(testUtils.TestConstants.TICKET_TOKEN_ID);
      winnersBoxes[0].assets.add({
        tokenId: testUtils.TestConstants.X_TOKEN_ID,
        amount: 1n,
      });
      activeRaffleOutputBox.assets.remove(
        testUtils.TestConstants.TICKET_TOKEN_ID,
      );
      activeRaffleOutputBox.addTokens({
        tokenId: testUtils.TestConstants.TICKET_TOKEN_ID,
        amount: 1_000_000_000n - 1n - 1n + 1n, // at last + 1n added to prevent burn token error
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle
     * by wrong raffle-details box without ticket token
     * @scenario
     * - create three output boxes by valid values and one winner box(remove ticket token from raffle-details box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong raffle-details box without ticket token', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();

      // Remove ticket token from raffle-details box
      raffleDetailsOutputBox.assets.remove(0);
      activeRaffleOutputBox.assets.remove(
        testUtils.TestConstants.TICKET_TOKEN_ID,
      );
      activeRaffleOutputBox.addTokens({
        tokenId: testUtils.TestConstants.TICKET_TOKEN_ID,
        amount: 1_000_000_000n - 1n - 1n + 1n, // at last + 1n added to prevent burn token error
      });

      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );
      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong raffle-details box R4 value
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong raffle-details box R4 value)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong raffle-details box R4 value', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Replace invalid R4 value from raffle-details box
      raffleDetailsOutputBox.setAdditionalRegisters({
        R4: SColl(SColl(SByte), [
          Array.from(Buffer.from('Invalid Name')),
          Array.from(Buffer.from('Some invalid descriptions...')),
        ]).toHex(),
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to when creating the giftTokenRepo without gift tokens
     * @scenario
     * - create three valid output boxes for activeRaffle, raffleDetail and winner box
     * - create giftTokenRepo without gift tokens
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when creating the giftTokenRepo without gift tokens', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
          // preventing of minting token of gift-token box
          null,
        );

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail to create active raffle by wrong R7 value of gift-token box
     * @scenario
     * - create three output boxes by valid values and one winner box(set wrong R7 value of gift-token box)
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail create active raffle by wrong R7 value of gift-token box', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Place wrong R7 value to the gift-token box
      giftTokenRepoOutputBox.setAdditionalRegisters({
        R4: SColl(SInt, [1]).toHex(),
        R5: SColl(SInt, [2]).toHex(),
        R6: SColl(SInt, [3]).toHex(),
        R7: SColl(SInt, [1, 1, Number(testUtils.TestConstants.FEE)]).toHex(),
        R8: SColl(SByte, Array.from(Buffer.from('abcd', 'hex'))),
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target inactive-raffle should fail trying to steal gift tokens in a new utxo
     * @scenario
     * - create all valid outputs (activeRaffle, raffleDetail, giftTokenRepo and winner box)
     * - mock an extra input UTxO to cover the extra output
     * - add an extra output stealing one gift token
     * - execute transaction
     * - check execution result
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail trying to steal gift tokens in a new utxo', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Create input and output box required for this test
      const extraInput = mockUTxO({
        ergoTree: inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        value: 150_000n,
        creationHeight: 10,
      });
      const changeBox = new OutputBuilder(
        150_000n,
        inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
      ).addTokens({
        tokenId:
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId,
        amount: 1n,
      });

      const transaction = new TransactionBuilder(
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.height,
      )
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
          // Add extra nano-erg as input
          extraInput,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
            1,
            inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
          ),
          changeBox,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .build();

      // Check execution result
      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target should fail creating of active raffle by 1 winner with invalid ticket token id
     * @scenario
     * - create three output boxes(by invalid ticket-token in active box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail creating of active raffle by 1 winner with invalid ticket token id', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const winnersOutputBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Replace Ticket-Token with another token
      const extraInputBox = mockUTxO({
        value: testUtils.TestConstants.FEE,
        ergoTree: inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        assets: [
          {
            tokenId: '12'.repeat(32),
            amount: 1_000_000_000n,
          },
        ],
      });
      activeRaffleOutputBox.assets.remove(1);
      activeRaffleOutputBox.assets.add({
        tokenId: '12'.repeat(32),
        amount: 1_000_000_000n - 1n - 1n,
      });

      const transaction = new TransactionBuilder(1000)
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
          extraInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersOutputBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target should fail creating of active raffle by 1 winner with invalid number of ticket token
     * @scenario
     * - create three output boxes(by invalid number of ticket token in active box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail creating of active raffle by 1 winner with invalid number of ticket token', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
          undefined,
          undefined,
          // Decreasing Ticket-Token number sets in activeRaffleOutputBox
          1_000_000_000n,
          undefined,
          999_999_997n,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const winnersOutputBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox.boxId.toString(),
        );
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      // Move one extra Ticket-Token to the giftTokenRepoOutputBox
      giftTokenRepoOutputBox.assets.add({
        tokenId: testUtils.TestConstants.TICKET_TOKEN_ID,
        amount: 1n,
      });

      const transaction = new TransactionBuilder(1000)
        .from([
          inactiveRaffleBy1WinnerTestRequirements.inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersOutputBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        // .sendChangeTo(project.address)
        .build();

      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });

    /**
     * @target should fail creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box
     * @scenario
     * - create three output boxes(by invalid ticket-token id in inactive input box)
     * - execute transaction
     * - check execution must raise error
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail creating of active raffle by 1 winner with invalid ticket token id in R7 of inactive input box', ({
      inactiveRaffleBy1WinnerTestRequirements,
    }) => {
      // Replace Ticket-Token id with invalid id
      const inactiveRaffleInputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createInactiveRaffleBoxMock(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          1_000_000_000n,
          '1234'.repeat(16),
          0n,
        );
      const extraInputBox = mockUTxO({
        value: testUtils.TestConstants.FEE,
        ergoTree: inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        assets: [
          {
            tokenId: '1234'.repeat(16),
            amount: 1_000_000_000n,
          },
        ],
      });

      const activeRaffleOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createActiveRaffleOutputBox(
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.someoneWallet.ergoTree,
          inactiveRaffleBy1WinnerTestRequirements.project.ergoTree,
        );
      const raffleDetailsOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createRaffleDetailsOutputBox();
      const winnersOutputBoxes =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createWinnersOutputBox(
          1,
          inactiveRaffleInputBox.boxId.toString(),
        );
      const giftTokenRepoOutputBox =
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.createGiftTokenRepoOutputBox(
          1,
        );

      const transaction = new TransactionBuilder(1000)
        .from([
          inactiveRaffleInputBox,
          inactiveRaffleBy1WinnerTestRequirements.ticketRepoInputBox,
          extraInputBox,
        ])
        .to([
          activeRaffleOutputBox,
          raffleDetailsOutputBox,
          giftTokenRepoOutputBox,
          ...winnersOutputBoxes,
        ])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(inactiveRaffleBy1WinnerTestRequirements.project.address)
        .build();

      expect(() =>
        inactiveRaffleBy1WinnerTestRequirements.boxFactory.chain.execute(
          transaction,
          { signers: [inactiveRaffleBy1WinnerTestRequirements.project] },
        ),
      ).toThrowError();
    });
  });
});
