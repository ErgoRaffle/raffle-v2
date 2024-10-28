import { it, describe, expect } from 'vitest';
import { SColl, SByte, SLong } from '@fleet-sdk/serializer';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';
import {
  X_TOKEN_ID,
  CREATOR_DEFAULT_BALANCE,
  UNKNOWN_WALLET_DEFAULT_BALANCE,
} from '../testUtils';
import * as constants from '../../constants';
import { ScriptNamesType } from '../../lib/types';

/*
 * create fixtures that contains below steps data:
 *   - mock boxFactory.chain and partners
 *   - compile contracts
 *   - create service input box
 * @returns vitest customized "it" object
 */
const createRaffleServiceTest = (winnersCount: bigint = 1n) => {
  const boxFactory = new testUtils.RaffleBoxFactory(
    { height: 1000 },
    constants.scriptList.filter(
      (value) => value != 'service',
    ) as ScriptNamesType[],
  );
  boxFactory.chain.setTip(100);
  const { creator, someone } = boxFactory.createPartners({
    Creator: CREATOR_DEFAULT_BALANCE,
    someone: UNKNOWN_WALLET_DEFAULT_BALANCE,
  });
  creator.addBalance({ tokens: [{ tokenId: X_TOKEN_ID, amount: 100n }] });
  // Created input service-box
  const serviceBox = boxFactory.createServiceBoxMock(
    creator.address.toString(),
  );
  const winnersPercent = [];
  for (let i = 0; i < winnersCount; i++)
    winnersPercent.push(1000n / winnersCount);
  serviceBox.setContextExtension({
    0: SColl(SLong, winnersPercent),
    1: SColl(SColl(SByte), [
      Array.from(Buffer.from(someone.address.toString())),
      Array.from(Buffer.from(creator.address.toString())),
    ]),
  });

  return it.extend({
    boxFactory: boxFactory,
    someoneWallet: someone,
    creator: creator,
    inputBoxes: [serviceBox, ...creator.utxos.toArray()],
  });
};

describe('Service', () => {
  const raffleServiceTest = createRaffleServiceTest();
  const raffleServiceBy10WinnersTest = createRaffleServiceTest(10n);

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
    raffleServiceTest(
      'should create raffle by 1 winner and by erg-goal successfully',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            1n,
            undefined,
            undefined,
            undefined,
            undefined,
            1_000_000_000n,
            inputBoxes[0].boxId.toString(),
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = boxFactory.chain.execute(transaction, {
          signers: [creator],
        });
        // Check execution result
        expect(res).true;
      },
    );

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
    raffleServiceBy10WinnersTest(
      'should create raffle by 10 winners and by erg-goal successfully',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            10n,
            undefined,
            undefined,
            undefined,
            undefined,
            1_000_000_000n,
            inputBoxes[0].boxId.toString(),
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = boxFactory.chain.execute(transaction, {
          signers: [creator],
        });
        // Check execution result
        expect(res).true;
      },
    );

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
    raffleServiceTest(
      'should create raffle by 1 winner and X token-goal successfully',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            1n,
            { tokenId: testUtils.X_TOKEN_ID, amount: 1n },
            undefined,
            undefined,
            undefined,
            1_000_000_000n,
            inputBoxes[0].boxId.toString(),
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = boxFactory.chain.execute(transaction, {
          signers: [creator],
        });
        // Check execution result
        expect(res).true;
      },
    );

    /**
     * @target service should fail when try to create new raffle without LicenseToken
     * @scenario
     * - create three output boxes by values(remove LicenseToken from InactiveRaffleBox)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle without LicenseToken on the inactiveRaffleOutputBox',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            1n,
          );
        inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

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
    raffleServiceTest(
      'should fail when try to create new raffle without decreasing LicenseToken from serviceOutputBox',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
          1000000000n,
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            1n,
          );
        inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect service fee
     * @scenario
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle with incorrect service fee',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            1n,
            undefined,
            undefined,
            110n,
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail when try to create new raffle with invalid service fee on the output service box
     * @scenario
     * - create three output boxes by values(set invalid service fee on the output service box)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle with invalid license fee on the output service box',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
          20n,
          10n,
          110n,
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            1n,
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect sum of winners percents
     * @scenario
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle with incorrect sum of winners percents',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 600n]),
        });
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            2n,
            undefined,
            [500n, 600n],
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail when try to create new raffle with invalid winners hash
     * @scenario
     * - create three output boxes by values(with invalid winners hash)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle with invalid winners hash',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            1n,
            undefined,
            undefined,
            undefined,
            Buffer.from('invalid winners count hash').toString('hex'),
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail of try to create new raffle with incorrect winners count
     * @scenario
     * - create three output boxes by values(with incorrect winners count)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail of try to create new raffle with incorrect winners count',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 500n]),
        });
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            2n,
            undefined,
            [1000n],
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect winners count in extension
     * @scenario
     * - create three output boxes by values(with incorrect winners count in extension)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle with incorrect winners count in extension',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            2n,
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect sum of winners percents
     * @scenario
     * - create three output boxes by values(with incorrect sum of winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle with incorrect sum of winners percents',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [450n, 450n]),
        });
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            2n,
            undefined,
            [450n, 450n],
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect ticket-id
     * @scenario
     * - create three output boxes by values(with incorrect ticket-id)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must throw error
     */
    raffleServiceTest(
      'should fail when try to create new raffle with incorrect ticket-id',
      ({ boxFactory, someoneWallet, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 500n]),
        });
        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
        );
        const ticketRepoOutputBox = boxFactory.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox =
          boxFactory.createInactiveRaffleOutputBox(
            creator.address.toString(),
            someoneWallet.address.toString(),
            creator.address.toString(),
            2n,
            undefined,
            undefined,
            undefined,
            undefined,
            1_000_000_000n,
            '0'.repeat(64),
          );
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          boxFactory.chain.execute(transaction, { signers: [creator] }),
        ).toThrowError();
      },
    );
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
    raffleServiceTest(
      'should spend raffle ServiceBox by OwnerNFT',
      ({ boxFactory, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        creator.addBalance({
          tokens: [{ tokenId: testUtils.OWNER_NFT_ID, amount: 1n }],
        });
        const newInputBoxes: Box<bigint>[] = [
          serviceBox,
          ...creator.utxos.toArray(),
        ];
        // Create output boxes
        const outputBox = new OutputBuilder(
          15_000_000n,
          creator.address.ergoTree,
        ).addTokens([
          {
            tokenId: testUtils.OWNER_NFT_ID,
            amount: 1n,
          },
        ]);
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(newInputBoxes)
          .to([outputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();
        const res = boxFactory.chain.execute(transaction, {
          signers: [creator],
        });
        // Check execution result
        expect(res).true;
      },
    );
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
    raffleServiceTest(
      'should close raffle or Redeem Raffle',
      ({ boxFactory, creator, someoneWallet }) => {
        // Mock Required Things
        const serviceBox = boxFactory.createServiceBoxMock(
          creator.address.toString(),
          999_999_999n,
        );
        const successRaffleInputBox = boxFactory.createSuccessRaffleBoxMock(
          testUtils.CREATION_FEE + 4n * testUtils.FEE,
          testUtils.LICENSE_TOKEN_ID,
          '0123456789012345',
          [],
          60n,
          1n,
          0n,
          61n,
          1n,
          testUtils.TICKET_TOKEN_ID,
          999_999_998n,
          undefined,
        );

        // Create output boxes
        const serviceOutputBox = boxFactory.createServiceOutputBox(
          creator.address.toString(),
          1_000_000_000n,
        );
        const inputBoxes: Box<bigint>[] = [
          serviceBox,
          successRaffleInputBox,
          ...creator.utxos.toArray(),
        ];
        // Execute transaction
        const transaction = new TransactionBuilder(boxFactory.chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = boxFactory.chain.execute(transaction, {
          signers: [someoneWallet],
        });
        // Check execution result
        expect(res).true;
      },
    );
  });
});
