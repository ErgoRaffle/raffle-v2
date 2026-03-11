import { Amount, Network } from '@fleet-sdk/common';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { Buffer } from 'buffer';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ServiceBuilder } from '@ergo-raffle/boxes';
import { CreationTxBuilder } from '@ergo-raffle/transactions';

import { CreationProxyParams, ProxyFactory } from '../lib';
import { createMockUtxo, CustomMockChain } from './testUtils';

describe('CreationProxy', () => {
  let chain: CustomMockChain;
  let creator: KeyedMockChainParty;
  let service: KeyedMockChainParty;
  let implementer: KeyedMockChainParty;
  let proxyBox: Box<Amount>;
  let proxyParams: CreationProxyParams;

  beforeAll(() => {
    // Set up mock chain
    chain = new CustomMockChain();
    chain.setTip(100);

    // Create parties
    service = chain.newParty('service');
    creator = chain.newParty('creator');
    implementer = chain.newParty('implementer');

    // Generate creation proxy contract using ProxyFactory
    const proxyFactory = new ProxyFactory(Network.Mainnet);
    const proxyGenerator = proxyFactory.getCreationGenerator();

    const winnerCount = 2;
    const winnersPercent = 200n; // 20%
    const winnersPercentList = [600n, 400n]; // [1000] for 1 winner

    proxyParams = {
      creationFee: 1_000_000_000n,
      name: 'Test Raffle',
      description: 'Test Description',
      ticketPrice: 10n,
      pictures: [
        'https://example.com/picture1.jpg',
        'https://example.com/picture2.jpg',
      ],
      goal: 1000n,
      winnersPercent: Number(winnersPercent),
      txFee: 1_000_000n,
      implementorErgoTreeHash: Buffer.from(
        blake2b256(Buffer.from(implementer.ergoTree, 'hex')),
      ).toString('hex'),
      creatorErgoTreeHash: Buffer.from(
        blake2b256(Buffer.from(creator.ergoTree, 'hex')),
      ).toString('hex'),
      winnerCount: winnerCount,
      winnersPercentList,
      raffleDeadline: chain.height + 1000,
      expirationHeight: chain.height + 100,
    };

    // Create creation proxy input box
    const proxyOutput = proxyGenerator
      .generateProxyBox(proxyParams)
      .setCreationHeight(5);

    proxyBox = createMockUtxo(proxyOutput);
  });

  describe('raffle creation transaction', () => {
    let createRaffleBuilder: CreationTxBuilder;
    beforeEach(() => {
      // Create service input box using service builder
      const serviceOutputBox = new ServiceBuilder()
        .setOwnerAddress(service.address.toString())
        .setValue(1_000_000_000n)
        .setCreationHeight(4)
        .setServiceFeePercent(100n)
        .setImplementerFeePercent(100n)
        .setCreationFee(proxyParams.creationFee)
        .setTxFee(proxyParams.txFee)
        .setLicenseTokenCount(1_000_000_000n)
        .build();
      const serviceBox = createMockUtxo(serviceOutputBox);

      // create creation transaction builder with all correct parameters
      createRaffleBuilder = new CreationTxBuilder()
        .setServiceBox(serviceBox)
        .setFeeBoxes([proxyBox])
        .setCreatorAddress(creator.address.toString())
        .setImplementerErgoTree(implementer.ergoTree)
        .setWinnersCount(proxyParams.winnerCount)
        .setDeadline(BigInt(proxyParams.raffleDeadline))
        .setWinnersPercent(proxyParams.winnersPercentList.map(BigInt))
        .setTicketPrice(proxyParams.ticketPrice)
        .setWinnersSharePercent(BigInt(proxyParams.winnersPercent))
        .setGoal(proxyParams.goal)
        .setInactiveRaffleValue(
          BigInt(proxyBox.value.toString()) - proxyParams.txFee * BigInt(2),
        )
        .setRaffleName(proxyParams.name)
        .setRaffleDescription(proxyParams.description)
        .setRafflePictures(proxyParams.pictures || [])
        .setTicketTokenCount(100n)
        .setChainHeight(chain.height)
        .setTxFee(proxyParams.txFee);
    });

    /**
     * @target creation proxy should create an erg-goal raffle successfully
     * @scenario
     * - create service input box and creation proxy input box
     * - create three output boxes: service, ticketRepo, inactiveRaffle
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should create an erg-goal raffle via creation proxy successfully', () => {
      // Execute transaction
      // [Service, Proxy] --> [Service, TicketRepo, InactiveRaffle, Change]
      const transaction = createRaffleBuilder.build();

      const res = chain.executeTx(transaction, []);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target creation proxy should create a token-goal raffle successfully
     * @scenario
     * - create service input box and creation proxy input box
     * - create three output boxes: service, ticketRepo, inactiveRaffle
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should create a token-goal raffle via creation proxy successfully', () => {
      proxyParams.collectingTokenId = '0'.repeat(64);

      // Create creation proxy input box including collecting token
      const proxyOutput = new ProxyFactory(Network.Mainnet)
        .getCreationGenerator()
        .generateProxyBox(proxyParams)
        .setCreationHeight(5)
        .setValue(100000000000n);

      const proxyBox = createMockUtxo(proxyOutput);

      createRaffleBuilder.setCollectingTokenId(proxyParams.collectingTokenId);

      // Execute transaction
      // [Service, Proxy] --> [Service, TicketRepo, InactiveRaffle, Change]
      const transaction = createRaffleBuilder.setFeeBoxes([proxyBox]).build();
      const res = chain.executeTx(transaction, []);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target creation proxy should fail with incorrect parameters
     * @scenario
     * - for each parameter, modify it to an incorrect value
     * - build and execute transaction
     * - check execution throws error for each incorrect parameter
     * @expected
     * - transaction execution should throw an error for each incorrect parameter
     */
    const testCases: Array<
      [string, (builder: CreationTxBuilder) => CreationTxBuilder]
    > = [
      [
        'winnersPercent',
        (builder) =>
          builder.setWinnersSharePercent(
            BigInt(proxyParams.winnersPercent) + 1n,
          ),
      ],
      [
        'ticketPrice',
        (builder) => builder.setTicketPrice(proxyParams.ticketPrice + 1n),
      ],
      ['goal', (builder) => builder.setGoal(proxyParams.goal + 1n)],
      [
        'deadline',
        (builder) =>
          builder.setDeadline(BigInt(proxyParams.raffleDeadline) + 1n),
      ],
      [
        'implementerErgoTreeHash',
        (builder) =>
          builder.setImplementerErgoTree(
            creator.ergoTree, // Wrong ergo tree
          ),
      ],
      [
        'creatorErgoTreeHash',
        (builder) => builder.setCreatorAddress(implementer.address.toString()), // Wrong creator
      ],
      ['name', (builder) => builder.setRaffleName('Wrong Name')],
      [
        'description',
        (builder) => builder.setRaffleDescription('Wrong Description'),
      ],
      [
        'winnersPercentList',
        (builder) => builder.setWinnersPercent([500n, 500n]),
      ],
      [
        'winnerCount',
        (builder) =>
          builder
            .setWinnersCount(proxyParams.winnerCount + 1)
            .setWinnersPercent([500n, 500n, 0n]),
      ],
    ];
    it.each(testCases)(
      'should fail creation transaction with incorrect %s',
      (_, modifier) => {
        // apply modifier on builder
        const builder = createRaffleBuilder;
        modifier(builder);

        // Each incorrect parameter should cause transaction execution to fail
        expect(() => {
          chain.executeTx(builder.build(), []);
        }).toThrow();
      },
    );

    /**
     * @target should fail creation transaction with incorrect token for a token-goal raffle
     * @scenario
     * - create proxy input box with a collecting token
     * - use a different token to construct the creation transaction
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail creation transaction with incorrect token for a token-goal raffle', () => {
      proxyParams.collectingTokenId = '0'.repeat(64);

      // Create creation proxy input box including collecting token
      const proxyOutput = new ProxyFactory(Network.Mainnet)
        .getCreationGenerator()
        .generateProxyBox(proxyParams)
        .setCreationHeight(5)
        .setValue(100000000000n);

      const proxyBox = createMockUtxo(proxyOutput);
      const transaction = createRaffleBuilder.setFeeBoxes([proxyBox]).build();

      expect(() => {
        chain.executeTx(transaction, []);
      }).toThrow();
    });
  });

  describe('refund transaction', () => {
    let creatorRefundBox: OutputBuilder;
    beforeEach(() => {
      // create creator refund box with all tokens from proxy box
      creatorRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        creator.address.toString(),
      ).addTokens(
        proxyBox.assets.map((asset) => ({
          tokenId: asset.tokenId,
          amount: BigInt(asset.amount),
        })),
      );
    });

    /**
     * @target creation proxy should refund to user address successfully
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to creator address with all tokens
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should refund proxy to user address successfully', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      // expirationHeight is chain.height + 100 = 200
      chain.setTip(proxyParams.expirationHeight);

      // [Proxy] --> [CreatorRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([creatorRefundBox])
        .payFee(proxyParams.txFee)
        .build();

      // Execute transaction
      const res = chain.executeTx(transaction, [creator]);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target creation proxy should fail to refund when deadline has not passed
     * @scenario
     * - set chain height to < expirationHeight and < deadline
     * - create transaction with only proxy box as input
     * - create one output box to creator address with all tokens
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

      // [Proxy] --> [CreatorRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([creatorRefundBox])
        .payFee(proxyParams.txFee)
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => {
        chain.executeTx(transaction, [creator]);
      }).toThrow();
    });

    /**
     * @target creation proxy should fail to refund with incorrect recipient address
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to wrong address (implementer instead of creator) with all tokens
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with incorrect recipient address', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create refund box with wrong recipient address (implementer instead of creator)
      const wrongRecipientRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        implementer.address.toString(), // Wrong recipient address
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
        chain.executeTx(transaction, [creator]);
      }).toThrow();
    });

    /**
     * @target creation proxy should fail to refund with burnt tokens
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to creator address but with missing tokens (burnt)
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with burnt tokens', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create creation proxy input box including collecting token
      proxyParams.collectingTokenId = '0'.repeat(64);

      const proxyOutput = new ProxyFactory(Network.Mainnet)
        .getCreationGenerator()
        .generateProxyBox(proxyParams)
        .setCreationHeight(5);

      proxyBox = createMockUtxo(proxyOutput);

      // Create refund box with missing tokens (simulating burnt tokens)
      const refundBoxWithBurntTokens = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        creator.address.toString(),
      );

      // [Proxy] --> [CreatorRefundWithBurntTokens]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([refundBoxWithBurntTokens])
        .payFee(proxyParams.txFee)
        .burnTokens(proxyBox.assets[0])
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => {
        chain.executeTx(transaction, [creator]);
      }).toThrow();
    });
  });
});
