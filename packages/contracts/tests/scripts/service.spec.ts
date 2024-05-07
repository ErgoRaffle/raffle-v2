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
     * - create three output boxes by values(set only one winner)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'Should create raffle by 1 winner and donate able with Ergo successfully',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({ 0: SColl(SLong, [1000n]) });
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [creator] });
        // Check execution result
        expect(res).true;
      }
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
    raffleTest(
      'Should create raffle by 10 winners and donate able with Ergo successfully',
      ({ chain, rosen, creator, inputBoxes }) => {
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
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          10n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [creator] });
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
    raffleTest(
      'Should create raffle by 1 winner and X token-goal successfully',
      ({ chain, rosen, creator, contractsAddresses }) => {
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
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          1n,
          { tokenId: testUtils.X_TOKEN_ID, amount: 1n },
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [creator] });
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
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle without LicenseToken on the inactiveRaffleOutputBox',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
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
     * - create three output boxes by values
     * - remove LicenseToken from InactiveRaffleBox and without decrease LicenseToken
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle without decreasing LicenseToken from serviceOutputBox',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox(1000000000n);
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect service fee
     * @scenario
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect service fee',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
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
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );

    /**
     * @target service should fail when try to create new raffle with invalid service fee on the output service box
     * @scenario
     * - create three output boxes by values(set invalid service fee on the output service box)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with invalid license fee on the output service box',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox(
          20n,
          10n,
          110n,
        );
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          1n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
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
     * - create three output boxes by values(by incorrect winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect sum of winners percents',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 600n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          2n,
          undefined,
          [500n, 600n],
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
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
     * - create three output boxes by values(with invalid winners hash)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with invalid winners hash',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
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
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('register value at R7');
      },
    );

    /**
     * @target service should fail of try to create new raffle with incorrect winners count
     * @scenario
     * - create three output boxes by values(with incorrect winners count)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail of try to create new raffle with incorrect winners count',
      ({ chain, rosen, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 500n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          2n,
          undefined,
          [1000n],
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
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
     * - create three output boxes by values(with incorrect winners count in extension)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect winners count in extension',
      ({ chain, rosen, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [1000n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          2n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
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
     * - create three output boxes by values(with incorrect sum of winners percents)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect sum of winners percents',
      ({ chain, rosen, creator, inputBoxes }) => {
        // Mock Required Things
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [450n, 450n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          serviceBox.boxId,
          2n,
          undefined,
          [450n, 450n],
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
      },
    );

    /**
     * @target service should fail when try to create new raffle with incorrect ticket-id
     * @scenario
     * - create three output boxes by values(with incorrect ticket-id)
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output box
     */
    raffleTest(
      'should fail when try to create new raffle with incorrect ticket-id',
      ({ chain, rosen, creator, inputBoxes }) => {
        const serviceBox = inputBoxes[0];
        serviceBox.setContextExtension({
          0: SColl(SLong, [500n, 500n]),
        });
        // Create output boxes
        const serviceOutputBox = testUtils.createServiceOutputBox();
        const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox();
        const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
          rosen.address.toString(),
          creator.address.toString(),
          '0'.repeat(64),
          2n,
        );
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        expect(() =>
          chain.execute(transaction, { signers: [creator] }),
        ).toThrowError('Script reduced to false');
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
          creator.address.ergoTree,
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
     * @scenario by decreased licenseToken value
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
        const successRaffleInputBox = testUtils.createSuccessRaffleBox(
          rosen.address.toString(),
          1n,
        );
        // Create output boxes
        const serviceOutputBox =
          testUtils.createServiceOutputBox(1_000_000_000n);
        const inputBoxes: Box<bigint>[] = [
          serviceBox,
          successRaffleInputBox,
          ...creator.utxos.toArray(),
        ];
        // Execute transaction
        const transaction = new TransactionBuilder(chain.height)
          .from(inputBoxes)
          .to([serviceOutputBox])
          .payFee(testUtils.FEE)
          .sendChangeTo(creator.address)
          .build();

        const res = chain.execute(transaction, { signers: [rosen] });
        // Check execution result
        expect(res).true;
      },
    );
  });
});
