/* eslint no-empty: ["error", { "allowEmptyCatch": true }] */

import { describe, it, expect } from 'vitest';
import { SColl, SLong } from '@fleet-sdk/serializer';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { MockChain } from '@fleet-sdk/mock-chain';

import * as testUtils from '../testUtils';

describe('Service Contract', () => {
  describe('Success scenarios of creating raffle', () => {
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
    it('Should create raffle by 1 winner and donatable with Ergo successfuly', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      // Created input service-box
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        1n,
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
      } catch (err) {
        expect(false, `On-chain execution error: ${err}`).true;
      }
      // Check execution result
      expect(res).true;
    });

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
    it('Should create raffle by 10 winners and donatable with Ergo successfuly', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      // Created input service-box
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        10n,
      );
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
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
      } catch (err) {
        expect(false, `On-chain execution error: ${err}`).true;
      }
      // Check execution result
      expect(res).true;
    });

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
    it('Should create raffle by 1 winner and donatable with X token successfuly', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      creator.addBalance({ tokens: [testUtils.xToken] });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      // Created input service-box
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        1n,
        { tokenId: testUtils.X_TOKEN_ID, amount: 1n },
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
      } catch (err) {
        expect(false, `On-chain execution error: ${err}`).true;
      }
      // Check execution result
      expect(
        creator.utxos.toArray()[1].assets[0].tokenId == testUtils.X_TOKEN_ID &&
          creator.utxos.toArray()[1].assets[0].amount < testUtils.xToken.amount,
      ).true;
      expect(res).true;
    });

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
    it('should spend raffle ServiceBox by OwnerNFT', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      // Created input service-box
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = new OutputBuilder(
        15_000_000n,
        serviceContractParty.address.ergoTree,
      ).addTokens([
        {
          tokenId: testUtils.OWNER_NFT_ID,
          amount: 1n,
        },
      ]);
      creator.addBalance({
        tokens: [{ tokenId: testUtils.OWNER_NFT_ID, amount: 1n }],
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
      } catch (err) {
        expect(false, `On-chain execution error: ${err}`).true;
      }
      // Check execution result
      expect(res).true;
    });

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
    it('should close raffle or Redeem Raffle', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      // Created input service-box
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
        999999999n,
      );
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      const activeRaffleOutputBox = testUtils.createActiveRaffleBox(
        rosen.address.ergoTree,
        rosen.address.toString(),
        1n,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
        1000000000n,
      );
      // const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
      //     rosen.ergoTree,
      // );
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        activeRaffleOutputBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [rosen] });
      } catch (err) {
        expect(false, `On-chain execution error: ${err}`).true;
      }
      // Check execution result
      expect(res).true;
    });
  });

  describe('Fail scenarios of creating raffle', () => {
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
    it('should fail when try to create new raffle without LicenseToken', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        1n,
      );
      inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {
        //
      }
      // Check execution result
      expect(res).false;
    });

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
    it('should fail when try to create new raffle with unbalanced LicenseToken', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
        1000000000n,
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        1n,
      );
      inactiveRaffleOutputBox.assets.remove(testUtils.LICENSE_TOKEN_ID);
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
      //   let res = expect(() => chain.execute(transaction, {signers: [rosen, creator]})).throw(`On-chain execution error`);
    });

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
    it('should fail when try to create new raffle with incorrect sum of winners percents', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        2n,
        undefined,
        [500n, 600n],
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [500n, 600n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });

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
    it('should fail when try to create new raffle with incorrect service fee', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        1n,
        undefined,
        undefined,
        110n,
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });

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
    it('should fail when try to create new raffle with invalid license fee on the output service box', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
        20n,
        10n,
        110n,
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        1n,
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });

    /**
     * @target service should faile when try to create new raffle with invalid winners hash
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
    it('should faile when try to create new raffle with invalid winners hash', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        1n,
        undefined,
        undefined,
        undefined,
        '12fd45bc12fd45bc12fd45bc12fd45bc12fd45bc12fd45bc',
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });

    /**
     * @target service should Faile of try to create new raffle with incorrect winners count
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
    it('should Faile of try to create new raffle with incorrect winners count', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        2n,
        undefined,
        [1000n],
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [500n, 500n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });

    /**
     * @target service should faile when try to create new raffle with incorrect winners count in extension
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
    it('should faile when try to create new raffle with incorrect winners count in extension', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        2n,
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [1000n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });

    /**
     * @target service should faile when try to create new raffle with incorrect sum of winners percents
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
    it('should faile when try to create new raffle with incorrect sum of winners percents', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        serviceBox.boxId,
        2n,
        undefined,
        [450n, 450n],
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [450n, 450n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });

    /**
     * @target service should faile when try to create new raffle with incorrect ticket-id
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
    it('should faile when try to create new raffle with incorrect ticket-id', () => {
      // Mock Required Things
      const chain = new MockChain({ height: 1000 });
      const { creator, rosen } = testUtils.createPartners(chain, {
        Creator: 10_000_000_000n,
        Rosen: 10_000_000_000n,
      });
      const contractsAddresses = testUtils.initialContracts(rosen.ergoTree);
      const serviceBox = testUtils.createServiceBoxMock(
        contractsAddresses['service'],
        rosen.key.address.toString(),
      );
      // Created input service-box
      const serviceContractParty = testUtils.initServiceContractParty(
        chain,
        serviceBox.ergoTree,
      );
      // Create output boxes
      const serviceOuputBox = testUtils.createServiceOuputBox(
        serviceContractParty.address.ergoTree,
        rosen.key.address.toString(),
      );
      const ticketRepoOutputBox = testUtils.createTicketRepoOutputBox(
        rosen.ergoTree,
      );
      const inactiveRaffleOutputBox = testUtils.createInactiveRaffleOutputBox(
        rosen.address.toString(),
        creator.address.toString(),
        '0'.repeat(64),
        2n,
      );
      serviceBox.setContextExtension({
        0: SColl(SLong, [500n, 500n]),
      });
      const inputBoxes: Box<bigint>[] = [
        serviceBox,
        ...creator.utxos.toArray(),
      ];
      // Execute transaction
      const transaction = new TransactionBuilder(chain.height)
        .from(inputBoxes)
        .to([serviceOuputBox, ticketRepoOutputBox, inactiveRaffleOutputBox])
        .payFee(testUtils.FEE)
        .sendChangeTo(creator.address)
        .build();

      let res = false;
      try {
        res = chain.execute(transaction, { signers: [creator] });
        expect(
          false,
          `Raffle with InactiveRaffleOutputBox that not contains License-Toen must fail`,
        ).true;
      } catch (err) {}
      // Check execution result
      expect(res).false;
    });
  });
});
