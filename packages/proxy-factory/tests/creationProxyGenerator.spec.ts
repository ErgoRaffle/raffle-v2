import { raffleInfo } from '@ergo-raffle/contracts';
import { CreationTxBuilder } from '@ergo-raffle/transactions';
import { Amount, Network } from '@fleet-sdk/common';
import {
  ErgoUnsignedInput,
  ErgoAddress,
  SColl,
  SLong,
  SByte,
  Box,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { KeyedMockChainParty, mockUTxO } from '@fleet-sdk/mock-chain';
import { Buffer } from 'buffer';
import { beforeAll, describe, expect, it } from 'vitest';

import { ProxyFactory } from '../lib/proxyFactory';
import { CreationProxyParams, ProxyGenerationResult } from '../lib/types';
import { CustomMockChain } from './testUtils';

describe('CreationProxy', () => {
  let chain: CustomMockChain;
  let creator: KeyedMockChainParty;
  let implementer: KeyedMockChainParty;
  let serviceBox: Box<Amount>;
  let proxyBox: Box<Amount>;
  let proxyParams: CreationProxyParams;
  let winnersPercentList: bigint[];
  let proxyResult: ProxyGenerationResult;

  beforeAll(() => {
    // Set up mock chain
    chain = new CustomMockChain();
    chain.setTip(100);

    // Create parties
    creator = chain.newParty('creator');
    implementer = chain.newParty('implementer');

    // Generate creation proxy contract using ProxyFactory
    const proxyFactory = new ProxyFactory(Network.Mainnet);
    const proxyGenerator = proxyFactory.getCreationGenerator();

    const winnerCount = 1;
    const winnersPercent = 200n; // 20%
    winnersPercentList = [1000n]; // [1000] for 1 winner

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
      deadline: chain.height + 1000,
      expirationHeight: chain.height + 100,
    };

    proxyResult = proxyGenerator.generateCreationProxy(proxyParams);

    // Create service input box using raffleInfo addresses
    const serviceAddress = ErgoAddress.fromBase58(
      raffleInfo.addresses.service,
    ).ergoTree;
    serviceBox = new ErgoUnsignedInput(
      mockUTxO({
        ergoTree: serviceAddress,
        value: 1_000_000n,
        creationHeight: 4,
        assets: [
          { tokenId: raffleInfo.tokens.serviceNft, amount: 1n },
          { tokenId: raffleInfo.tokens.raffleLicense, amount: 1_000_000_000n },
        ],
        additionalRegisters: {
          R4: SColl(SLong, [100n, 100n, 1_000_000_000n, 1_000_000n]).toHex(),
          R5: SColl(
            SByte,
            Array.from(blake2b256(Buffer.from(creator.ergoTree, 'hex'))),
          ).toHex(),
        },
      }),
    );

    // Create creation proxy input box
    proxyBox = new ErgoUnsignedInput(
      mockUTxO({
        ergoTree: ErgoAddress.fromBase58(proxyResult.proxyAddress).ergoTree,
        value: proxyResult.requiredNanoErgs,
        creationHeight: 5,
        assets: [],
      }),
    );
  });

  describe('creationProxyGenerator', () => {
    /**
     * @target creation proxy should create an erg-goal raffle successfully
     * @scenario
     * - create service input box and creation proxy input box
     * - create three output boxes: service, ticketRepo, inactiveRaffle
     * - execute transaction
     * - check execution done successfully
     * @expected
     * - transaction result must be true
     * - it should create three output boxes: service, ticketRepo, inactiveRaffle
     */
    it('should create an erg-goal raffle via creation proxy successfully', () => {
      // Create service output box using ServiceBuilder
      const createRaffleBuilder = new CreationTxBuilder()
        .setServiceBox(serviceBox)
        .setFeeBoxes([proxyBox])
        .setCreatorAddress(creator.address.toString())
        .setImplementerErgoTree(implementer.ergoTree)
        .setWinnersCount(proxyParams.winnerCount)
        .setDeadline(BigInt(proxyParams.deadline))
        .setWinnersPercent(proxyParams.winnersPercentList.map(BigInt))
        .setTicketPrice(proxyParams.ticketPrice)
        .setWinnersSharePercent(BigInt(proxyParams.winnersPercent))
        .setGoal(proxyParams.goal)
        .setInactiveRaffleValue(
          proxyResult.requiredNanoErgs - proxyParams.txFee * BigInt(2),
        )
        .setRaffleName(proxyParams.name)
        .setRaffleDescription(proxyParams.description)
        .setRafflePictures(proxyParams.pictures || [])
        .setTicketTokenCount(100n)
        .setChainHeight(chain.height)
        .setTxFee(proxyParams.txFee);

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
     * - transaction result must be true
     * - it should create three output boxes: service, ticketRepo, inactiveRaffle
     */
    it('should create a token-goal raffle via creation proxy successfully', () => {
      proxyParams.collectingTokenId = '0'.repeat(64);
      const proxyResult = new ProxyFactory(Network.Mainnet)
        .getCreationGenerator()
        .generateCreationProxy(proxyParams);

      // Create creation proxy input box including collecting token
      proxyBox = new ErgoUnsignedInput(
        mockUTxO({
          ergoTree: ErgoAddress.fromBase58(proxyResult.proxyAddress).ergoTree,
          value: 100000000000n,
          creationHeight: 5,
          assets: proxyResult.requiredTokens || [],
        }),
      );
      // Create service output box using ServiceBuilder
      const createRaffleBuilder = new CreationTxBuilder()
        .setServiceBox(serviceBox)
        .setFeeBoxes([proxyBox])
        .setCreatorAddress(creator.address.toString())
        .setImplementerErgoTree(implementer.ergoTree)
        .setWinnersCount(proxyParams.winnerCount)
        .setDeadline(BigInt(proxyParams.deadline))
        .setWinnersPercent(proxyParams.winnersPercentList.map(BigInt))
        .setTicketPrice(proxyParams.ticketPrice)
        .setWinnersSharePercent(BigInt(proxyParams.winnersPercent))
        .setGoal(proxyParams.goal)
        .setInactiveRaffleValue(10000000000n)
        .setRaffleName(proxyParams.name)
        .setRaffleDescription(proxyParams.description)
        .setRafflePictures(proxyParams.pictures || [])
        .setTicketTokenCount(100n)
        .setChainHeight(chain.height)
        .setTxFee(proxyParams.txFee)
        .setCollectingTokenId(proxyParams.collectingTokenId);

      // Execute transaction
      // [Service, Proxy] --> [Service, TicketRepo, InactiveRaffle, Change]
      const transaction = createRaffleBuilder.build();

      const res = chain.executeTx(transaction, []);

      // Check execution result
      expect(res).toBeTruthy();
    });
  });
});
