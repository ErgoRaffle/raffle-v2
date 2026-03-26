import { Amount } from '@fleet-sdk/common';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { Buffer } from 'buffer';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ServiceBuilder } from '@ergo-raffle/boxes';
import { CreationTxBuilder } from '@ergo-raffle/transactions';

import { initialContracts, TestConstants } from '../../testUtils';
import { CreationProxyParams, buildCreationProxyBox } from './proxyBoxHelpers';
import { createMockUtxo, CustomMockChain } from './testUtils';

describe('CreationProxy', () => {
  let chain: CustomMockChain;
  let organizer: KeyedMockChainParty;
  let service: KeyedMockChainParty;
  let implementer: KeyedMockChainParty;
  let project: KeyedMockChainParty;
  let proxyBox: Box<Amount>;
  let proxyParams: CreationProxyParams;
  let contracts: { [key: string]: string };

  beforeAll(() => {
    TestConstants.overrideBySampleConfigs();
    chain = new CustomMockChain();
    chain.setTip(100);

    service = chain.newParty('service');
    organizer = chain.newParty('organizer');
    project = chain.newParty('project');
    implementer = chain.newParty('implementer');

    contracts = initialContracts();

    const winnerCount = 2;
    const winnersPercent = 200n;
    const winnersPercentList = [600n, 400n];

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
      implementerErgoTreeHash: Buffer.from(
        blake2b256(Buffer.from(implementer.ergoTree, 'hex')),
      ).toString('hex'),
      organizerErgoTreeHash: Buffer.from(
        blake2b256(Buffer.from(organizer.ergoTree, 'hex')),
      ).toString('hex'),
      projectErgoTreeHash: Buffer.from(
        blake2b256(Buffer.from(project.ergoTree, 'hex')),
      ).toString('hex'),
      winnerCount,
      winnersPercentList,
      raffleDeadline: chain.height + 1000,
      expirationHeight: chain.height + 100,
    };

    const proxyOutput = buildCreationProxyBox(
      contracts['creationProxy'],
      proxyParams,
      { creationHeight: 5 },
    );
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
        .setOrganizerAddress(organizer.address.toString())
        .setProjectErgoTree(project.ergoTree)
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
      // Create creation proxy input box including collecting token
      const tokenGoalParams: CreationProxyParams = {
        ...proxyParams,
        collectingTokenId: '0'.repeat(64),
      };
      const proxyOutput = buildCreationProxyBox(
        contracts['creationProxy'],
        tokenGoalParams,
        { creationHeight: 5, value: 100000000000n },
      );
      const proxyBoxTokenGoal = createMockUtxo(proxyOutput);

      createRaffleBuilder.setCollectingTokenId(
        tokenGoalParams.collectingTokenId!,
      );

      // Execute transaction
      // [Service, Proxy] --> [Service, TicketRepo, InactiveRaffle, Change]
      const transaction = createRaffleBuilder
        .setFeeBoxes([proxyBoxTokenGoal])
        .build();
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
        (b) =>
          b.setWinnersSharePercent(BigInt(proxyParams.winnersPercent) + 1n),
      ],
      ['ticketPrice', (b) => b.setTicketPrice(proxyParams.ticketPrice + 1n)],
      ['goal', (b) => b.setGoal(proxyParams.goal + 1n)],
      [
        'deadline',
        (b) => b.setDeadline(BigInt(proxyParams.raffleDeadline) + 1n),
      ],
      [
        'implementerErgoTreeHash',
        (b) => b.setImplementerErgoTree(organizer.ergoTree),
      ],
      [
        'projectErgoTreeHash',
        (b) =>
          b.setFeeBoxes([
            createMockUtxo(
              buildCreationProxyBox(
                contracts['creationProxy'],
                {
                  ...proxyParams,
                  projectErgoTreeHash: Buffer.from(
                    blake2b256(Buffer.from(implementer.ergoTree, 'hex')),
                  ).toString('hex'),
                },
                { creationHeight: 5 },
              ),
            ),
          ]),
      ],
      ['name', (b) => b.setRaffleName('Wrong Name')],
      ['description', (b) => b.setRaffleDescription('Wrong Description')],
      ['winnersPercentList', (b) => b.setWinnersPercent([500n, 500n])],
      [
        'winnerCount',
        (b) =>
          b
            .setWinnersCount(proxyParams.winnerCount + 1)
            .setWinnersPercent([500n, 500n, 0n]),
      ],
    ];
    it.each(testCases)(
      'should fail creation transaction with incorrect %s',
      (_, modifier) => {
        // apply modifier on builder
        modifier(createRaffleBuilder);

        // Each incorrect parameter should cause transaction execution to fail
        expect(() =>
          chain.executeTx(createRaffleBuilder.build(), []),
        ).toThrow();
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
      // Create creation proxy input box including collecting token
      const tokenGoalParams: CreationProxyParams = {
        ...proxyParams,
        collectingTokenId: '0'.repeat(64),
      };
      const proxyOutput = buildCreationProxyBox(
        contracts['creationProxy'],
        tokenGoalParams,
        { creationHeight: 5, value: 100000000000n },
      );
      const proxyBoxTokenGoal = createMockUtxo(proxyOutput);
      const transaction = createRaffleBuilder
        .setFeeBoxes([proxyBoxTokenGoal])
        .build();

      expect(() => {
        chain.executeTx(transaction, []);
      }).toThrow();
    });
  });

  describe('refund transaction', () => {
    let organizerRefundBox: OutputBuilder;
    beforeEach(() => {
      // create organizer refund box with all tokens from proxy box
      organizerRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        organizer.address.toString(),
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

      // [Proxy] --> [OrganizerRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([organizerRefundBox])
        .payFee(proxyParams.txFee)
        .build();
      // Execute transaction
      const res = chain.executeTx(transaction, [organizer]);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target creation proxy should fail to refund when two proxy boxes are spent in one transaction
     * @scenario
     * - set chain height to >= expirationHeight
     * - create second proxy input box
     * - create one organizer refund output box
     * - execute single transaction that spends both proxy boxes
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund when two proxy boxes are spent at once', () => {
      chain.setTip(proxyParams.expirationHeight);

      const secondProxyOutput = buildCreationProxyBox(
        contracts['creationProxy'],
        proxyParams,
        { creationHeight: 6 },
      );
      const secondProxyBox = createMockUtxo(secondProxyOutput);

      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox, secondProxyBox])
        .to([organizerRefundBox])
        .payFee(proxyParams.txFee)
        .sendChangeTo(implementer.address.toString())
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .build();

      expect(() => chain.executeTx(transaction, [organizer])).toThrow();
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

      // [Proxy] --> [OrganizerRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([organizerRefundBox])
        .payFee(proxyParams.txFee)
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => chain.executeTx(transaction, [organizer])).toThrow();
    });

    /**
     * @target creation proxy should fail to refund with incorrect recipient address
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to wrong address (implementer instead of organizer) with all tokens
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with incorrect recipient address', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create refund box with wrong recipient address (implementer instead of organizer)
      const wrongRecipientRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        implementer.address.toString(),
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
      expect(() => chain.executeTx(transaction, [organizer])).toThrow();
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

      const tokenGoalParams: CreationProxyParams = {
        ...proxyParams,
        collectingTokenId: '0'.repeat(64),
      };
      const proxyOutput = buildCreationProxyBox(
        contracts['creationProxy'],
        tokenGoalParams,
        { creationHeight: 5 },
      );
      const proxyBoxWithToken = createMockUtxo(proxyOutput);

      // Create refund box with missing tokens (simulating burnt tokens)
      const refundBoxWithBurntTokens = new OutputBuilder(
        BigInt(proxyBoxWithToken.value) - proxyParams.txFee,
        organizer.address.toString(),
      );

      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBoxWithToken])
        .to([refundBoxWithBurntTokens])
        .payFee(proxyParams.txFee)
        .burnTokens(proxyBoxWithToken.assets[0])
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => chain.executeTx(transaction, [organizer])).toThrow();
    });
  });
});
