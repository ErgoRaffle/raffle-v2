import { Amount, Network } from '@fleet-sdk/common';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ActiveRaffleBuilder } from '@ergo-raffle/boxes';
import { DonateTxBuilder } from '@ergo-raffle/transactions';

import { DonationProxyParams, ProxyFactory } from '../lib';
import { createMockUtxo, CustomMockChain } from './testUtils';

describe('DonationProxy', () => {
  let chain: CustomMockChain;
  let donator: KeyedMockChainParty;
  let creator: KeyedMockChainParty;
  let implementer: KeyedMockChainParty;
  let proxyBox: Box<Amount>;
  let activeRaffleBuilder: ActiveRaffleBuilder;
  let activeRaffleBox: Box<Amount>;
  let proxyParams: DonationProxyParams;
  let raffleId: string;

  beforeAll(() => {
    // Set up mock chain
    chain = new CustomMockChain();
    chain.setTip(100);

    // Create parties
    donator = chain.newParty('donator');
    creator = chain.newParty('creator');
    implementer = chain.newParty('implementer');

    // Generate donation proxy contract using ProxyFactory
    const proxyFactory = new ProxyFactory(Network.Mainnet);
    const proxyGenerator = proxyFactory.getDonationGenerator();

    raffleId = '1'.repeat(64); // Mock raffle ID

    proxyParams = {
      ticketCount: 10,
      ticketPrice: 100n,
      raffleId: raffleId,
      donatorErgoTreeHash: Buffer.from(
        blake2b256(Buffer.from(donator.ergoTree, 'hex')),
      ).toString('hex'),
      raffleDeadline: chain.height + 1000,
      expirationHeight: chain.height + 100,
      txFee: 1_000_000n,
    };

    // Create donation proxy input box
    const proxyOutput = proxyGenerator
      .generateProxyBox(proxyParams)
      .setCreationHeight(5);

    proxyBox = createMockUtxo(proxyOutput);

    // Create active raffle box
    activeRaffleBuilder = new ActiveRaffleBuilder()
      .setValue(1_000_000_000n)
      .setCreationHeight(4)
      .setWinnersPercent(200n)
      .setServiceFeePercent(100n)
      .setImplementerFeePercent(100n)
      .setTicketPrice(proxyParams.ticketPrice)
      .setGoal(1000n)
      .setDeadline(BigInt(proxyParams.raffleDeadline))
      .setTxFee(proxyParams.txFee)
      .setWinnersCount(1)
      .setTotalSoldTickets(0n)
      .setServiceAddress(creator.address.toString())
      .setImplementerAddress(implementer.address.toString())
      .setProjectAddress(creator.address.toString())
      .setTicketId(raffleId)
      .setTicketCount(1_000_000_000n);

    activeRaffleBox = createMockUtxo(activeRaffleBuilder.build());
  });

  describe('donation transaction', () => {
    let donateTxBuilder: DonateTxBuilder;

    beforeEach(() => {
      // Create donation transaction builder with all correct parameters
      donateTxBuilder = new DonateTxBuilder()
        .setActiveRaffle(activeRaffleBox)
        .setDonatorUtxos([proxyBox])
        .setDonatorAddress(donator.address.toString())
        .setDonationTicketCount(BigInt(proxyParams.ticketCount))
        .setChainHeight(chain.height)
        .setTxFee(proxyParams.txFee);
    });

    /**
     * @target donation proxy should create an erg-goal donation successfully
     * @scenario
     * - create active raffle input box and donation proxy input box
     * - create two output boxes: updated active raffle, ticket
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should create an erg-goal donation via donation proxy successfully', () => {
      // Execute transaction
      // [ActiveRaffle, Proxy, DonatorUtxo] --> [ActiveRaffle, Ticket, Change]
      const transaction = donateTxBuilder.build();

      const res = chain.executeTx(transaction, []);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target donation proxy should create a token-goal donation successfully
     * @scenario
     * - set collecting token id in proxy params
     * - generate donation proxy containing collecting token
     * - update active raffle to have collecting token
     * - update donation transaction builder to use updated active raffle and proxy box
     * - execute transaction
     * - check execution done successfully
     */
    it('should create a token-goal donation via donation proxy successfully', () => {
      const collectingTokenId = '0'.repeat(64);

      // Create donation proxy input box including collecting token
      const proxyOutput = new ProxyFactory(Network.Mainnet)
        .getDonationGenerator()
        .generateProxyBox({
          ...proxyParams,
          requiredTokenId: collectingTokenId,
        })
        .setCreationHeight(5);

      const proxyBox = createMockUtxo(proxyOutput);

      // Change active raffle to have collecting token
      activeRaffleBuilder = activeRaffleBuilder
        .setCollectingTokenId(collectingTokenId)
        .setCollectingTokenCount(1n);

      const activeRaffleBox = createMockUtxo(activeRaffleBuilder.build());

      // Update builder with new boxes
      donateTxBuilder
        .setActiveRaffle(activeRaffleBox)
        .setDonatorUtxos([proxyBox]);

      // Execute transaction
      // [ActiveRaffle, Proxy, DonatorUtxo] --> [ActiveRaffle, Ticket, Change]
      const transaction = donateTxBuilder.build();
      const res = chain.executeTx(transaction, []);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target donation proxy should fail with incorrect parameters
     * @scenario
     * - for each parameter, modify it to an incorrect value
     * - build and execute transaction
     * - check execution throws error for each incorrect parameter
     * @expected
     * - transaction execution should throw an error for each incorrect parameter
     */
    const testCases: Array<
      [string, (builder: DonateTxBuilder) => DonateTxBuilder]
    > = [
      [
        'ticketCount',
        (builder) =>
          builder.setDonationTicketCount(BigInt(proxyParams.ticketCount) - 1n),
      ],
      [
        'donatorAddress',
        (builder) => builder.setDonatorAddress(creator.address.toString()), // Wrong donator
      ],
      [
        'raffleId',
        (builder) => {
          return builder.setActiveRaffle(
            createMockUtxo(
              activeRaffleBuilder.setTicketId('2'.repeat(64)).build(),
            ),
          );
        },
      ],
    ];

    it.each(testCases)(
      'should fail donation transaction with incorrect %s',
      (_, modifier) => {
        // apply modifier on builder
        const builder = donateTxBuilder;
        modifier(builder);

        // Each incorrect parameter should cause transaction execution to fail
        expect(() => {
          chain.executeTx(builder.build(), []);
        }).toThrow();
      },
    );
  });

  describe('refund transaction', () => {
    let donatorRefundBox: OutputBuilder;

    beforeEach(() => {
      // create donator refund box with all tokens from proxy box
      donatorRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        donator.address.toString(),
      ).addTokens(
        proxyBox.assets.map((asset) => ({
          tokenId: asset.tokenId,
          amount: BigInt(asset.amount),
        })),
      );
    });

    /**
     * @target donation proxy should refund to donator address successfully
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to donator address with all tokens
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should refund proxy to donator address successfully', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      // expirationHeight is chain.height + 100 = 200
      chain.setTip(proxyParams.expirationHeight);

      // [Proxy] --> [DonatorRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([donatorRefundBox])
        .payFee(proxyParams.txFee)
        .build();

      // Execute transaction
      const res = chain.executeTx(transaction, [donator]);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target donation proxy should fail to refund when deadline has not passed
     * @scenario
     * - set chain height to < expirationHeight and < deadline
     * - create transaction with only proxy box as input
     * - create one output box to donator address with all tokens
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy when deadline has not passed', () => {
      // Set chain height to be less than both expirationHeight and deadline
      // expirationHeight is chain.height + 100 = 200, deadline is chain.height + 1000 = 1100
      // Set to 150 which is < 200 and < 1100
      chain.setTip(150);

      // [Proxy] --> [DonatorRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([donatorRefundBox])
        .payFee(proxyParams.txFee)
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => {
        chain.executeTx(transaction, [donator]);
      }).toThrow();
    });

    /**
     * @target donation proxy should fail to refund with incorrect recipient address
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to wrong address (creator instead of donator) with all tokens
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with incorrect recipient address', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create refund box with wrong recipient address (creator instead of donator)
      const wrongRecipientRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        creator.address.toString(), // Wrong recipient address
      ).addTokens(
        proxyBox.assets.map((asset) => ({
          tokenId: asset.tokenId,
          amount: BigInt(asset.amount),
        })),
      );

      // [Proxy] --> [WrongRecipientRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([wrongRecipientRefundBox])
        .payFee(proxyParams.txFee)
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => {
        chain.executeTx(transaction, [donator]);
      }).toThrow();
    });

    /**
     * @target donation proxy should fail to refund with burnt tokens
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to donator address but with missing tokens (burnt)
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with burnt tokens', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create donation proxy input box including collecting token
      proxyParams.requiredTokenId = '0'.repeat(64);

      // Create donation proxy input box
      const proxyOutput = new ProxyFactory(Network.Mainnet)
        .getDonationGenerator()
        .generateProxyBox(proxyParams)
        .setCreationHeight(5)
        .setValue(100000000000n);

      proxyBox = createMockUtxo(proxyOutput);

      // Create refund box with missing tokens (simulating burnt tokens)
      const refundBoxWithBurntTokens = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        donator.address.toString(),
      );

      // [Proxy] --> [DonatorRefundWithBurntTokens]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([refundBoxWithBurntTokens])
        .payFee(proxyParams.txFee)
        .burnTokens(proxyBox.assets[0])
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => {
        chain.executeTx(transaction, [donator]);
      }).toThrow();
    });
  });
});
