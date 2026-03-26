import { Amount } from '@fleet-sdk/common';
import { Box, TransactionBuilder, OutputBuilder } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty } from '@fleet-sdk/mock-chain';
import { Buffer } from 'buffer';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { WinnerBuilder } from '@ergo-raffle/boxes';
import { AddGiftTxBuilder } from '@ergo-raffle/transactions';

import { initialContracts, TestConstants } from '../../testUtils';
import { AddGiftProxyParams, buildAddGiftProxyBox } from './proxyBoxHelpers';
import { createMockUtxo, CustomMockChain } from './testUtils';

describe('AddGiftProxy', () => {
  let chain: CustomMockChain;
  let giftGiver: KeyedMockChainParty;
  let attacker: KeyedMockChainParty;
  let fakeParty: KeyedMockChainParty;
  let proxyBox: Box<Amount>;
  let winnerBox: Box<Amount>;
  let winnerBuilder: WinnerBuilder;
  let proxyParams: AddGiftProxyParams;
  let raffleId: string;
  let winnerIndex: number;
  let contracts: { [key: string]: string };

  beforeAll(() => {
    TestConstants.overrideBySampleConfigs();
    chain = new CustomMockChain();
    chain.setTip(100);

    giftGiver = chain.newParty('giftGiver');
    attacker = chain.newParty('attacker');
    fakeParty = chain.newParty('fakeParty');

    contracts = initialContracts();

    raffleId = '1'.repeat(64);
    winnerIndex = 1;

    proxyParams = {
      raffleId,
      winnerIndex,
      giftGiverErgoTreeHash: Buffer.from(
        blake2b256(Buffer.from(giftGiver.ergoTree, 'hex')),
      ).toString('hex'),
      raffleDeadline: chain.height + 1000,
      expirationHeight: chain.height + 100,
      txFee: 1_000_000n,
    };

    const proxyOutput = buildAddGiftProxyBox(
      contracts['addGiftProxy'],
      proxyParams,
      { creationHeight: 5 },
    );
    proxyBox = createMockUtxo(proxyOutput);

    winnerBuilder = new WinnerBuilder()
      .setValue(4_000_000n)
      .setCreationHeight(4)
      .setRewardPercent(1000n)
      .setDeadline(BigInt(proxyParams.raffleDeadline))
      .setTxFee(proxyParams.txFee)
      .setWinnerIndex(winnerIndex)
      .setGiftCount(0n)
      .setTicketToken(raffleId)
      .setGiftToken('2'.repeat(64), 100n);

    winnerBox = createMockUtxo(winnerBuilder.build());
  });

  describe('gift addition transaction', () => {
    let addGiftTxBuilder: AddGiftTxBuilder;

    beforeEach(() => {
      // Create gift addition transaction builder with all correct parameters
      addGiftTxBuilder = new AddGiftTxBuilder()
        .setWinner(winnerBox)
        .setGiftGiverUtxos([proxyBox])
        .setGiftGiverAddress(giftGiver.address.toString())
        .setGiftValue(BigInt(proxyBox.value) - proxyParams.txFee)
        .setChainHeight(chain.height)
        .setTxFee(proxyParams.txFee);
    });

    /**
     * @target add gift proxy should create a gift successfully
     * @scenario
     * - create winner input box and add gift proxy input box
     * - create two output boxes: updated winner, gift
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should create a gift via add gift proxy successfully', () => {
      // Execute transaction
      // [Winner, Proxy] --> [Winner, Gift]
      const transaction = addGiftTxBuilder.build();

      const res = chain.executeTx(transaction, []);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target add gift proxy should create a gift with tokens successfully
     * @scenario
     * - create winner input box and add gift proxy input box
     * - add gift tokens to the transaction builder
     * - create two output boxes: updated winner, gift
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should create a gift with tokens via add gift proxy successfully', () => {
      const giftTokenId = '4'.repeat(64);
      const giftTokenAmount = 10n;

      const proxyOutput = buildAddGiftProxyBox(
        contracts['addGiftProxy'],
        proxyParams,
        {
          creationHeight: 5,
          tokens: [{ tokenId: giftTokenId, amount: giftTokenAmount }],
        },
      );
      const proxyBoxWithTokens = createMockUtxo(proxyOutput);

      // Add gift tokens to the builder
      addGiftTxBuilder
        .setGiftTokens([{ tokenId: giftTokenId, amount: giftTokenAmount }])
        .setGiftGiverUtxos([proxyBoxWithTokens]);

      // Execute transaction
      // [Winner, Proxy] --> [Winner, Gift, Change]
      const transaction = addGiftTxBuilder.build();
      const res = chain.executeTx(transaction, []);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target add gift proxy should fail when gift tokens are not transferred compeletly
     * @scenario
     * - create gift proxy input box
     * - add incorrect token count for gift tokens to the transaction builder
     * - add extra utxo to cover the change box value
     * - create two output boxes: updated winner, gift, change
     * - execute transaction
     * @expected
     * - transaction execution should throw
     */
    it('add gift proxy should fail when gift tokens are not transferred compeletly', () => {
      const giftTokenId = '4'.repeat(64);
      const giftTokenAmount = 10n;

      const proxyOutput = buildAddGiftProxyBox(
        contracts['addGiftProxy'],
        proxyParams,
        {
          creationHeight: 5,
          tokens: [{ tokenId: giftTokenId, amount: giftTokenAmount }],
        },
      );
      const proxyBoxWithTokens = createMockUtxo(proxyOutput);
      giftGiver.addBalance({ nanoergs: 1000000n });

      // Add gift tokens to the builder
      addGiftTxBuilder
        .setGiftTokens([{ tokenId: giftTokenId, amount: giftTokenAmount - 1n }])
        .setGiftGiverUtxos([proxyBoxWithTokens, ...giftGiver.utxos]);

      // Execute transaction
      // [Winner, Proxy] --> [Winner, Gift, Change]
      const transaction = addGiftTxBuilder.build();

      // Check execution result
      expect(() => chain.executeTx(transaction, [giftGiver])).toThrow();
    });

    /**
     * @target add gift proxy should fail with incorrect parameters
     * @scenario
     * - for each parameter, modify it to an incorrect value
     * - build and execute transaction
     * - check execution throws error for each incorrect parameter
     * @expected
     * - transaction execution should throw an error for each incorrect parameter
     */
    const testCases: Array<
      [string, (builder: AddGiftTxBuilder) => AddGiftTxBuilder]
    > = [
      [
        'winnerIndex',
        (builder) =>
          builder.setWinner(
            createMockUtxo(
              winnerBuilder.setWinnerIndex(winnerIndex + 1).build(),
            ),
          ),
      ],
      [
        'raffleId',
        (builder) =>
          builder.setWinner(
            createMockUtxo(
              winnerBuilder.setTicketToken('2'.repeat(64)).build(),
            ),
          ),
      ],
      [
        'giftGiverAddress',
        (builder) => builder.setGiftGiverAddress(fakeParty.address.toString()),
      ],
      [
        'value',
        (builder) =>
          builder.setGiftValue(BigInt(proxyBox.value) - proxyParams.txFee * 2n),
      ],
    ];

    it.each(testCases)(
      'should fail gift addition transaction with incorrect %s',
      (_, modifier) => {
        // apply modifier on builder
        modifier(addGiftTxBuilder);

        // Each incorrect parameter should cause transaction execution to fail
        expect(() => chain.executeTx(addGiftTxBuilder.build(), [])).toThrow();
      },
    );
  });

  describe('refund transaction', () => {
    let giftGiverRefundBox: OutputBuilder;

    beforeEach(() => {
      // create gift giver refund box with all tokens from proxy box
      giftGiverRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        giftGiver.address.toString(),
      ).addTokens(
        proxyBox.assets.map((asset) => ({
          tokenId: asset.tokenId,
          amount: BigInt(asset.amount),
        })),
      );
    });

    /**
     * @target add gift proxy should refund to gift giver address successfully
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to gift giver address with all tokens
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction must be done successfully
     */
    it('should refund proxy to gift giver address successfully', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      // expirationHeight is chain.height + 100 = 200
      chain.setTip(proxyParams.expirationHeight);

      // [Proxy] --> [GiftGiverRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([giftGiverRefundBox])
        .payFee(proxyParams.txFee)
        .build();
      // Execute transaction
      const res = chain.executeTx(transaction, [giftGiver]);

      // Check execution result
      expect(res).toBeTruthy();
    });

    /**
     * @target add gift proxy should fail to refund when two proxy boxes are spent in one transaction
     * @scenario
     * - set chain height to >= expirationHeight
     * - create second proxy input box
     * - create two refund output boxes (one to gift giver, one to attacker)
     * - execute single transaction that spends both proxy boxes
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund when two proxy boxes are spent at once', () => {
      chain.setTip(proxyParams.expirationHeight);

      const secondProxyOutput = buildAddGiftProxyBox(
        contracts['addGiftProxy'],
        proxyParams,
        { creationHeight: 6 },
      );
      const secondProxyBox = createMockUtxo(secondProxyOutput);

      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox, secondProxyBox])
        .to([giftGiverRefundBox])
        .payFee(proxyParams.txFee)
        .sendChangeTo(attacker.address.toString())
        .configureSelector((selector) => {
          selector.defineStrategy((inputs) => inputs);
        })
        .build();

      expect(() => chain.executeTx(transaction, [giftGiver])).toThrow();
    });

    /**
     * @target add gift proxy should fail to refund when deadline has not passed
     * @scenario
     * - set chain height to < expirationHeight and < deadline
     * - create transaction with only proxy box as input
     * - create one output box to gift giver address with all tokens
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

      // [Proxy] --> [GiftGiverRefund]
      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBox])
        .to([giftGiverRefundBox])
        .payFee(proxyParams.txFee)
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => chain.executeTx(transaction, [giftGiver])).toThrow();
    });

    /**
     * @target add gift proxy should fail to refund with incorrect recipient address
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to wrong address (creator instead of gift giver) with all tokens
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with incorrect recipient address', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create refund box with wrong recipient address (creator instead of gift giver)
      const wrongRecipientRefundBox = new OutputBuilder(
        BigInt(proxyBox.value) - proxyParams.txFee,
        fakeParty.address.toString(),
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
      expect(() => chain.executeTx(transaction, [giftGiver])).toThrow();
    });

    /**
     * @target add gift proxy should fail to refund with burnt tokens
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to gift giver address but with missing tokens (burnt)
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with burnt tokens', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create add gift proxy input box including gift token
      const giftTokenId = '0'.repeat(64);
      const proxyOutput = buildAddGiftProxyBox(
        contracts['addGiftProxy'],
        proxyParams,
        {
          creationHeight: 5,
          value: 100000000000n,
          tokens: [{ tokenId: giftTokenId, amount: 10n }],
        },
      );
      const proxyBoxWithToken = createMockUtxo(proxyOutput);

      // Create refund box with missing tokens (simulating burnt tokens)
      const refundBoxWithBurntTokens = new OutputBuilder(
        BigInt(proxyBoxWithToken.value) - proxyParams.txFee,
        giftGiver.address.toString(),
      );

      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBoxWithToken])
        .to([refundBoxWithBurntTokens])
        .payFee(proxyParams.txFee)
        .burnTokens(proxyBoxWithToken.assets[0])
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => chain.executeTx(transaction, [giftGiver])).toThrow();
    });

    /**
     * @target add gift proxy should fail to refund with incorrect redeemed value
     * @scenario
     * - set chain height to >= expirationHeight
     * - create transaction with only proxy box as input
     * - create one output box to gift giver address but with incorrect redeemed value
     * - execute transaction
     * - check execution throws error
     * @expected
     * - transaction execution should throw an error
     */
    it('should fail to refund proxy with incorrect redeemed value', () => {
      // Set chain height to >= expirationHeight to trigger refund scenario
      chain.setTip(proxyParams.expirationHeight);

      // Create add gift proxy input box including gift token
      const giftTokenId = '0'.repeat(64);
      const proxyOutput = buildAddGiftProxyBox(
        contracts['addGiftProxy'],
        proxyParams,
        {
          creationHeight: 5,
          value: 100000000000n,
          tokens: [{ tokenId: giftTokenId, amount: 10n }],
        },
      );
      const proxyBoxWithToken = createMockUtxo(proxyOutput);

      // Create refund box with incorrect redeemed value
      const refundBoxWithBurntTokens = new OutputBuilder(
        BigInt(proxyBoxWithToken.value) - 2n * proxyParams.txFee,
        giftGiver.address.toString(),
      ).addTokens(proxyBoxWithToken.assets);

      const transaction = new TransactionBuilder(chain.height)
        .from([proxyBoxWithToken])
        .to([refundBoxWithBurntTokens])
        .payFee(proxyParams.txFee * 2n) // pay extra fee to cover the extra value
        .build();

      // Execute transaction and expect it to throw an error
      expect(() => chain.executeTx(transaction, [giftGiver])).toThrow();
    });
  });
});
