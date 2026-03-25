import {
  Box,
  TransactionBuilder,
  OutputBuilder,
  ErgoUnsignedInput,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { SColl, SByte, SLong } from '@fleet-sdk/serializer';
import { it, describe, expect, beforeEach } from 'vitest';

import * as constants from '../../lib/constants';
import { ScriptNamesType } from '../../lib/types';
import * as testUtils from '../testUtils';

interface RaffleServiceTestInterface {
  boxFactory: testUtils.RaffleBoxFactory;
  owner: KeyedMockChainParty;
  someoneWallet: KeyedMockChainParty;
  inputBoxes: ErgoUnsignedInput[] | Box<bigint>[];
}

interface TestInterface {
  raffleServiceTestRequirements: RaffleServiceTestInterface;
  raffleServiceBy10WinnersTestRequirements: RaffleServiceTestInterface;
}

/*
 * provide test requirements that contains below data:
 *   - mock raffleServiceTestRequirements.boxFactory.chain and partners
 *   - compile contracts
 *   - create service input box
 * @returns object
 */
const provideRaffleServiceTestRequirements = (winnersCount: bigint = 1n) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'service',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { owner, someone } = boxFactory.createPartners({
    owner: testUtils.TestConstants.OWNER_DEFAULT_BALANCE,
    someone: testUtils.TestConstants.UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  owner.addBalance({
    tokens: [{ tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 100n }],
  });
  // Created input service-box
  const serviceBox = boxFactory.createServiceBoxMock(owner.ergoTree);
  const winnersPercent = [];
  for (let i = 0; i < winnersCount; i++)
    winnersPercent.push(1000n / winnersCount);
  serviceBox.setContextExtension({
    0: SColl(SLong, winnersPercent),
    1: SColl(SColl(SByte), [
      Array.from(Buffer.from(someone.ergoTree, 'hex')),
      Array.from(Buffer.from(owner.ergoTree, 'hex')),
    ]),
  });

  return {
    boxFactory: boxFactory,
    someoneWallet: someone,
    owner: owner,
    inputBoxes: [serviceBox, ...owner.utxos.toArray()],
  };
};

describe('Service', () => {
  beforeEach<TestInterface>(async (ctx) => {
    ctx.raffleServiceTestRequirements = provideRaffleServiceTestRequirements();
    ctx.raffleServiceBy10WinnersTestRequirements =
      provideRaffleServiceTestRequirements(10n);
  });

  describe('Create raffle', () => {
    /**
     * @target service should create new raffle by 1 winner successfully
     * @scenario
     * - create three output boxes by values(set only one winner)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    it<TestInterface>('should create raffle by 1 winner and by erg-goal successfully', ({
      raffleServiceTestRequirements,
    }) => {
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          1,
          undefined,
          undefined,
          undefined,
          undefined,
          1_000_000_000n,
          raffleServiceTestRequirements.inputBoxes[0].boxId.toString(),
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      const res = raffleServiceTestRequirements.boxFactory.chain.execute(
        transaction,
        {
          signers: [raffleServiceTestRequirements.owner],
        },
      );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target service should create new raffle by 10 winners successfully
     * @scenario
     * - create three output boxes by values(set 10 winners)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    it<TestInterface>('should create raffle by 10 winners and by erg-goal successfully', ({
      raffleServiceBy10WinnersTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceBy10WinnersTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceBy10WinnersTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceBy10WinnersTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceBy10WinnersTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceBy10WinnersTestRequirements.owner.ergoTree,
          raffleServiceBy10WinnersTestRequirements.someoneWallet.ergoTree,
          raffleServiceBy10WinnersTestRequirements.owner.ergoTree,
          10,
          undefined,
          undefined,
          undefined,
          undefined,
          1_000_000_000n,
          raffleServiceBy10WinnersTestRequirements.inputBoxes[0].boxId.toString(),
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceBy10WinnersTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceBy10WinnersTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceBy10WinnersTestRequirements.owner.address)
        .build();

      const res =
        raffleServiceBy10WinnersTestRequirements.boxFactory.chain.execute(
          transaction,
          {
            signers: [raffleServiceBy10WinnersTestRequirements.owner],
          },
        );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target service should create new raffle by 1 winner and donate able
     * by X token instead of Ergo successfully
     * @scenario
     * - create three output boxes by values(set X as donate able token)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    it<TestInterface>('should create raffle by 1 winner and X token-goal successfully', ({
      raffleServiceTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          1,
          { tokenId: testUtils.TestConstants.X_TOKEN_ID, amount: 1n },
          undefined,
          undefined,
          undefined,
          1_000_000_000n,
          raffleServiceTestRequirements.inputBoxes[0].boxId.toString(),
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      const res = raffleServiceTestRequirements.boxFactory.chain.execute(
        transaction,
        {
          signers: [raffleServiceTestRequirements.owner],
        },
      );
      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target service should fail when try to create new raffle without LicenseToken
     * @scenario
     * - create three output boxes by values(remove LicenseToken from InactiveRaffleBox)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle without LicenseToken on the inactiveRaffleOutputBox', ({
      raffleServiceTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
        );
      inactiveRaffleOutputBox.assets.remove(
        testUtils.TestConstants.LICENSE_TOKEN_ID,
      );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with unbalanced LicenseToken
     * @scenario
     * - create three output boxes by values
     * - remove LicenseToken from InactiveRaffleBox and without decrease LicenseToken
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle without decreasing LicenseToken from serviceOutputBox', ({
      raffleServiceTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          1000000000n,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
        );
      inactiveRaffleOutputBox.assets.remove(
        testUtils.TestConstants.LICENSE_TOKEN_ID,
      );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with incorrect service fee
     * @scenario
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle with incorrect service fee', ({
      raffleServiceTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          1,
          undefined,
          undefined,
          110n,
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with invalid service fee on the output service box
     * @scenario
     * - create three output boxes by values(set invalid service fee on the output service box)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle with invalid license fee on the output service box', ({
      raffleServiceTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          20n,
          10n,
          110n,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with incorrect sum of winners percents(more than 1000)
     * @scenario
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle with incorrect sum of winners percents(more than 1000)', ({
      raffleServiceTestRequirements,
    }) => {
      const serviceBox = raffleServiceTestRequirements
        .inputBoxes[0] as ErgoUnsignedInput;
      serviceBox.setContextExtension({
        0: SColl(SLong, [500n, 600n]),
      });
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          2,
          undefined,
          [500n, 600n],
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with invalid winners hash
     * @scenario
     * - create three output boxes by values(with invalid winners hash)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle with invalid winners hash', ({
      raffleServiceTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          1,
          undefined,
          undefined,
          undefined,
          Buffer.from('invalid winners count hash').toString('hex'),
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail of try to create new raffle with incorrect winners count
     * @scenario
     * - create three output boxes by values(with incorrect winners count)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail of try to create new raffle with incorrect winners count', ({
      raffleServiceTestRequirements,
    }) => {
      // Mock Required Things
      const serviceBox = raffleServiceTestRequirements
        .inputBoxes[0] as ErgoUnsignedInput;
      serviceBox.setContextExtension({
        0: SColl(SLong, [500n, 500n]),
      });
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          2,
          undefined,
          [1000n],
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with incorrect winners count in extension
     * @scenario
     * - create three output boxes by values(with incorrect winners count in extension)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle with incorrect winners count in extension', ({
      raffleServiceTestRequirements,
    }) => {
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          2,
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with incorrect sum of winners percents(less than 1000)
     * @scenario
     * - create three output boxes by values(with incorrect sum of winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle with incorrect sum of winners percents(less than 1000)', ({
      raffleServiceTestRequirements,
    }) => {
      // Mock Required Things
      const serviceBox = raffleServiceTestRequirements
        .inputBoxes[0] as ErgoUnsignedInput;
      serviceBox.setContextExtension({
        0: SColl(SLong, [450n, 450n]),
      });
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          2,
          undefined,
          [450n, 450n],
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });

    /**
     * @target service should fail when try to create new raffle with incorrect ticket-id
     * @scenario
     * - create three output boxes by values(with incorrect ticket-id)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    it<TestInterface>('should fail when try to create new raffle with incorrect ticket-id', ({
      raffleServiceTestRequirements,
    }) => {
      const serviceBox = raffleServiceTestRequirements
        .inputBoxes[0] as ErgoUnsignedInput;
      serviceBox.setContextExtension({
        0: SColl(SLong, [500n, 500n]),
      });
      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
        );
      const ticketRepoOutputBox =
        raffleServiceTestRequirements.boxFactory.createTicketRepoOutputBox();
      const inactiveRaffleOutputBox =
        raffleServiceTestRequirements.boxFactory.createInactiveRaffleOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          raffleServiceTestRequirements.someoneWallet.ergoTree,
          raffleServiceTestRequirements.owner.ergoTree,
          2,
          undefined,
          undefined,
          undefined,
          undefined,
          1_000_000_000n,
          '0'.repeat(64),
        );
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(raffleServiceTestRequirements.inputBoxes)
        .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      expect(() =>
        raffleServiceTestRequirements.boxFactory.chain.execute(transaction, {
          signers: [raffleServiceTestRequirements.owner],
        }),
      ).toThrowError();
    });
  });

  describe('Spend raffle', () => {
    /**
     * @target service should spend ServiceBox by OwnerNFT
     * @scenario
     * - create service output box by value OwnerNFTToken
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should spend raffle ServiceBox by OwnerNFT', ({
      raffleServiceTestRequirements,
    }) => {
      const serviceBox = raffleServiceTestRequirements.inputBoxes[0];
      raffleServiceTestRequirements.owner.addBalance({
        tokens: [{ tokenId: testUtils.TestConstants.OWNER_NFT_ID, amount: 1n }],
      });
      const newInputBoxes: Box<bigint>[] = [
        serviceBox,
        ...raffleServiceTestRequirements.owner.utxos.toArray(),
      ];
      // Create output boxes
      const outputBox = new OutputBuilder(
        15_000_000n,
        raffleServiceTestRequirements.owner.address.ergoTree,
      ).addTokens([
        {
          tokenId: testUtils.TestConstants.OWNER_NFT_ID,
          amount: 1n,
        },
      ]);
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(newInputBoxes)
        .to([outputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();
      const res = raffleServiceTestRequirements.boxFactory.chain.execute(
        transaction,
        {
          signers: [raffleServiceTestRequirements.owner],
        },
      );
      // Check execution result
      expect(res).toBeTruthy();
    });
  });

  describe('Close/Redeem raffle', () => {
    /**
     * @target service should close raffle or Redeem Raffle
     * @scenario by decreased licenseToken value
     * - create service output box by increased licenseToken value
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    it<TestInterface>('should close raffle or Redeem Raffle', ({
      raffleServiceTestRequirements,
    }) => {
      // Mock Required Things
      const serviceBox =
        raffleServiceTestRequirements.boxFactory.createServiceBoxMock(
          raffleServiceTestRequirements.owner.ergoTree,
          999_999_999n,
        );
      const successRaffleInputBox =
        raffleServiceTestRequirements.boxFactory.createSuccessRaffleBoxMock(
          testUtils.TestConstants.CREATION_FEE +
            4n * testUtils.TestConstants.FEE,
          testUtils.TestConstants.LICENSE_TOKEN_ID,
          blake2b256(
            Buffer.from(raffleServiceTestRequirements.owner.ergoTree, 'hex'),
          ),
          '0123456789012345',
          [],
          60n,
          1,
          0n,
          61n,
          1,
          testUtils.TestConstants.TICKET_TOKEN_ID,
          999_999_998n,
          undefined,
        );

      // Create output boxes
      const serviceOutputBox =
        raffleServiceTestRequirements.boxFactory.createServiceOutputBox(
          raffleServiceTestRequirements.owner.ergoTree,
          1_000_000_000n,
        );
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        successRaffleInputBox,
        ...raffleServiceTestRequirements.owner.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(
        raffleServiceTestRequirements.boxFactory.chain.height,
      )
        .from(inputBoxes)
        .to([serviceOutputBox])
        .payFee(testUtils.TestConstants.FEE)
        .sendChangeTo(raffleServiceTestRequirements.owner.address)
        .build();

      const res = raffleServiceTestRequirements.boxFactory.chain.execute(
        transaction,
        {
          signers: [raffleServiceTestRequirements.someoneWallet],
        },
      );
      // Check execution result
      expect(res).toBeTruthy();
    });
  });
});
