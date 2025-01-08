import { describe, it, expect } from 'vitest';
import { NetworkPrefix } from 'ergo-lib-wasm-nodejs';
import { MockChain } from '@fleet-sdk/mock-chain';
import {
  SColl,
  SByte,
  SLong,
  Network,
  Box,
  OutputBuilder,
  TransactionBuilder,
  Amount,
} from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';
import { ErgoNetworkType } from '@rosen-bridge/scanner';
import { Transaction } from '@rosen-bridge/abstract-extractor/lib/ergo/interfaces';
import { compile } from '@fleet-sdk/compiler';
import WinstonLogger from '@rosen-bridge/winston-logger/dist/WinstonLogger';

import { RaffleService } from '../../lib/entities';
import { RaffleServiceAction } from '../../lib/actions/raffleService';
import { RaffleServiceExtractor } from '../../lib/extractors/raffleService';
import { createDatabase } from '../utilsFunctions.mock';

const createRaffleServiceExtractorTest = async () => {
  const chain = new MockChain({ height: 100 });
  const testWallet = chain.newParty('test wallet');
  const dataSource = await createDatabase();
  const boxErgoTree = compile('{sigmaProp(true);}');

  testWallet.addBalance({
    nanoergs: 1_000_000_000_000n,
    tokens: [
      { tokenId: '1'.repeat(64), amount: 1n * 5n },
      { tokenId: '2'.repeat(64), amount: 1_000_000n * 5n },
    ],
  });

  const txs: Transaction[] = [];
  for (let i = 0; i < 5; i++) {
    const outputBox = new OutputBuilder(
      1000000n,
      boxErgoTree.toHex().toString(),
    )
      .addTokens([
        { tokenId: '1'.repeat(64), amount: 1n },
        { tokenId: '2'.repeat(64), amount: 1_000_000n },
      ])
      .setAdditionalRegisters({
        R4: SColl(SLong, [100n, 100n, 800n, 150000n]).toHex(),
        R5: SColl(
          SByte,
          Array.from(blake2b256(Buffer.from(testWallet.ergoTree, 'hex'))),
        ).toHex(),
      });

    const tx = new TransactionBuilder(chain.height)
      .from([...testWallet.utxos])
      .to([outputBox])
      .payFee(150000n)
      .sendChangeTo(testWallet.ergoTree)
      .build();

    chain.execute(tx);

    const txId = (tx.outputs as Box<Amount>[])[0].transactionId;
    const txEIP12 = tx.toEIP12Object();
    txs.push({
      id: txId,
      inputs: txEIP12.inputs.map((input) => ({ boxId: input.boxId })),
      dataInputs: [],
      outputs: txEIP12.outputs.map((output) => ({
        transactionId: txId,
        boxId: (output as Box<Amount>).boxId,
        index: 1,
        ...output,
        value: BigInt(output.value),
        assets: output.assets.map((asset) => ({
          tokenId: asset.tokenId,
          amount: BigInt(asset.amount),
        })),
      })),
    });
  }

  const winstonLogger = new WinstonLogger([
    { type: 'console', level: 'debug' },
  ]);
  const logger = winstonLogger.getLogger(import.meta.url);

  return it.extend({
    dataSource: dataSource,
    action: new RaffleServiceAction(dataSource),
    extractor: new RaffleServiceExtractor(
      dataSource,
      'RaffleService',
      NetworkPrefix.Testnet,
      'http://127.0.0.1/',
      ErgoNetworkType.Node,
      boxErgoTree.toAddress(Network.Testnet).toString(),
      undefined,
      logger,
    ),
    repository: dataSource.getRepository(RaffleService),
    testWallet: testWallet,
    txs: txs,
  });
};

const raffleServiceExtractorTest = await createRaffleServiceExtractorTest();

describe('RaffleServiceExtractor', () => {
  describe('processTransactions', () => {
    /**
     * @target should correctly store unspent RaffleService
     * boxes and update spent RaffleService boxes
     * @dependencies
     * @scenario
     * - call processTransactions functions
     * - check if RaffleServices have been saved to database successfully
     * @expected
     * - RaffleServices should have been saved to database successfully
     */
    raffleServiceExtractorTest(
      `should correctly store unspent RaffleService boxes and update spent
		RaffleService boxes`,
      async ({ repository, extractor, txs }) => {
        const success = await extractor.processTransactions(
          txs as Transaction[],
          { height: 101, hash: '123' },
        );

        const [, rowsCount] = await repository.findAndCount();

        expect(success).toBeTruthy();
        expect(rowsCount).toBe((txs as Transaction[]).length);
      },
    );
  });
});
