import { describe, expect } from 'vitest';
import { SColl, SLong } from '@fleet-sdk/serializer';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';

import * as testUtils from '../testUtils';
import { createRaffleTest } from '../testUtils';

describe('Service', () => {
  const raffleTest = createRaffleTest();

  describe('Create raffle', () => {
    /**
     * @target service should create new raffle by 1 winner successfully
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(set only one winner)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'Should create raffle by 1 winner and donatable with Ergo successfuly',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({ 0: SColl(SLong, [1000n]) });
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [creator] });
        // Check execution result
        expect(res).true;
      },
    );

    /**
     * @target service should create new raffle by 10 winners successfully
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(set 10 winners)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'Should create raffle by 10 winners and donatable with Ergo successfuly',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [
            100n,
            100n,
            100n,
            100n,
            100n,
            100n,
            100n,
            100n,
            100n,
            100n,
          ]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          10n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [creator] });
        // Check execution result
        expect(res).true;
      },
    );

    /**
     * @target service should create new raffle by 1 winner and donateable
     * by X token instead of Ergo successfully
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(set X as donatable token)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'Should create raffle by 1 winner and donatable with X token successfuly',
      ({ chain, contractsAddresses }) => {
        // Mock Required Things
        const { creator } = testUtils.createPartners(chain, {
          Creator: 10_000_000_000n,
          Rosen: 10_000_000_000n,
        });
        creator.addBalance({ tokens: [testUtils.xToken] });
        // Created input service-box
        const serviceBox = testUtils.createServiceBoxMock(
          (contractsAddresses as { [key: string]: string })['service'],
        );
        const inputBoxes: Box<bigint>[] = [
          serviceBox,
          ...creator.utxos.toArray(),
        ];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          1n,
          { tokenId: testUtils.X_TOKEN_ID, amount: 1n },
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [creator] });
        // Check execution result
        expect(res).true;
      },
    );
  });

  describe('Spend raffle', () => {
    /**
     * @target service should spend ServiceBox by OwnerNFT
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create service output box by value OwnerNFTToken
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleTest(
      'Should spend raffle ServiceBox by OwnerNFT',
      ({ chain, creator, inputBoxes }) => {
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
          serviceBox.ergoTree,
        ).addTokens([
          {
            tokenId: testUtils.OWNER_NFT_ID,
            amount: 1n,
          },
        ]);
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(newInputBoxes)
          .to([outputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();
        const res = chain.execute(transaction, { signers: [creator] });
        // Check execution result
        expect(res).true;
      },
    );
  });

  describe('Close/Redeem raffle', () => {
    /**
     * @target service should close raffle or Redeem Raffle
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box by decreased licenseToken value
     * - create service output box by increased licenseToken value
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     */
    raffleTest(
      'Should close raffle or Redeem Raffle',
      ({ chain, creator, rosen, contractsAddresses }) => {
        // Mock Required Things
        const serviceBox = testUtils.createServiceBoxMock(
          (contractsAddresses as { [key: string]: string })['service'],
          999_999_999n,
        );
        const successRaffleIntputBox = testUtils.createActiveRaffleBox(
          rosen.address.toString(),
          1n,
        );
        // Create output boxes
        const serviceoutputBox =
          testUtils.createServiceOutputBox(1_000_000_000n);
        const inputBoxes: Box<bigint>[] = [
          serviceBox,
          successRaffleIntputBox,
          ...creator.utxos.toArray(),
        ];
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [rosen] });
        // Check execution result
        expect(res).true;
      },
    );
  });

  describe('Invalid LicenseToken', () => {
    /**
     * @target service should fail when try to create new raffle without LicenseToken
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(remove LicenseToken from InactiveRaffleBox)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle without LicenseToken',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError(
          '-- error: ByIndex: index Int(0) out of bounds for collection size 0',
        );
      },
    );

    /**
     * @target service should fail when try to create new raffle with unbalanced LicenseToken
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values
     * - remove LicenseToken from InactiveRaffleBox and without decrease LicenseToken
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with unbalanced LicenseToken',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox(1000000000n);
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );
  });

  describe('Incorrect fees', () => {
    /**
     * @target service should fail when try to create new raffle with incorrect service fee
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect service fee',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          1n,
          undefined,
          undefined,
          110n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );

    /**
     * @target service should fail when try to create new raffle with invalid license fee on the output service box
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(set invalid service fee on the output service box)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with invalid license fee on the output service box',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox(
          20n,
          10n,
          110n,
        );
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );
  });

  describe('Invalid winners data', () => {
    /**
     * @target service should fail when try to create new raffle with incorrect sum of winners percents
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect sum of winners percents',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 600n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          2n,
          undefined,
          [500n, 600n],
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );

    /**
     * @target service should fail when try to create new raffle with invalid winners hash
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(with invalid winners hash)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with invalid winners hash',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          1n,
          undefined,
          undefined,
          undefined,
          Buffer.from('invalid winners count hash').toString('hex'),
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('unparseable register value at R7');
      },
    );

    /**
     * @target service should fail of try to create new raffle with incorrect winners count
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(with incorrect winners count)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail of try to create new raffle with incorrect winners count',
      ({ chain, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 500n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          2n,
          undefined,
          [1000n],
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect winners count in extension
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(with incorrect winners count in extension)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect winners count in extension',
      ({ chain, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          2n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect sum of winners percents
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(with incorrect sum of winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect sum of winners percents',
      ({ chain, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [450n, 450n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          serviceBox.boxId,
          2n,
          undefined,
          [450n, 450n],
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );
  });

  describe('Invalid Ticket-Token', () => {
    /**
     * @target service should fail when try to create new raffle with incorrect ticket-id
     * @scenario
     * - mock chain and partners
     * - compile contracts
     * - create service input box
     * - create three output boxes by values(with incorrect ticket-id)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect ticket-id',
      ({ chain, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 500n]),
        });
        // Create output boxes
        const serviceoutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          creator.address.toString(),
          '0'.repeat(64),
          2n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceoutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );
  });
});
