/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi, it, beforeEach, describe, expect } from 'vitest';
import { TransactionEntity, TxPot } from '@rosen-bridge/tx-pot';

import { BoxLookup } from '../lib/boxLookup';
import { Request } from '../lib/types/request';
import {
  mockDataSource,
  SampleTransactionEntities,
  SampleTransactionEntitiesContainsSpecialOutput,
  SampleTxs,
  unconfirmedTxList,
} from './mocked/boxLookup.mock';
import { Repository } from 'typeorm';
import { ErgoTransactionOutput, Transactions } from '@rosen-clients/ergo-node';
import { Network } from '@fleet-sdk/core';
import { afterEach } from 'node:test';
import { DataProvider } from '../lib/dataProvider';

interface DataProviderTestContext {
  txRepository: Repository<TransactionEntity>;
  txPot: TxPot;
  dataProvider: DataProvider;
  boxLookup: BoxLookup;
  request: Request;
}

beforeEach<DataProviderTestContext>(async (context) => {
  const dataSource = await mockDataSource();
  const txRepository = dataSource.getRepository(TransactionEntity);
  await txRepository.insert(SampleTransactionEntities);
  const dataProvider = new DataProvider(dataSource, 'http://127.0.0.1:9052');
  const boxLookup = new BoxLookup(dataProvider, Network.Mainnet);
  vi.mock('@rosen-clients/ergo-node', async () => {
    const actual = await vi.importActual<
      typeof import('@rosen-clients/ergo-node')
    >('@rosen-clients/ergo-node');
    return {
      ...actual,
      default: vi.fn().mockImplementation(() => ({
        getUnconfirmedTransactions: vi
          .fn()
          .mockResolvedValue(unconfirmedTxList as unknown as Transactions),
      })),
    };
  });

  vi.mock('@fleet-sdk/serializer', async () => {
    const actual = await vi.importActual<
      typeof import('@fleet-sdk/serializer')
    >('@fleet-sdk/serializer');

    return {
      ...actual,
      deserializeTransaction: vi.fn().mockImplementation(async (tx) => {
        return (
          SampleTxs[
            SampleTransactionEntities.map((stx) => stx.serializedTx).indexOf(
              Buffer.from(tx).toString('base64'),
            )
          ] ?? SampleTxs[SampleTxs.length - 1]
        );
      }),
    };
  });

  context.txRepository = txRepository;
  context.dataProvider = (boxLookup as any).dataProvider;
  context.boxLookup = boxLookup;
  context.request = {} as Request;
});

afterEach(async () => {
  vi.restoreAllMocks();
});

describe('DataProvider', () => {
  describe('getUnspentBoxes', () => {
    /**
     * should retrieve and combine unspent boxes from node and TxPot
     * @scenario
     * - call the getUnspentBoxes method
     * - assert unspentBoxes size must be equal to the TxPot unspent boxes plus node unspent boxes
     * @expected
     * - unspentBoxes size must be equal to 4
     */
    it<DataProviderTestContext>('should retrieve and combine unspent boxes from node and TxPot', async ({
      boxLookup,
      dataProvider,
    }) => {
      // Act
      const unspentBoxesList = (
        await dataProvider['getUnspentBoxes'](
          Array.from(boxLookup.getRequests().values()),
        )
      ).unspentBoxes;

      // Assert
      expect((unspentBoxesList as ErgoTransactionOutput[]).length).toEqual(4);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([
        unconfirmedTxList[0].outputs[0].boxId,
        SampleTxs[0].outputs[0].boxId,
        SampleTxs[1].outputs[0].boxId,
        SampleTxs[2].outputs[0].boxId,
      ]);
    });

    /**
     * should filter unspent boxes from node and TxPot when a box exists as spent and meanwhile unspent transactions
     * @scenario
     * - check a bot exists as a unspent box
     * - insert a certain output box id to the tx-pot that already exists on the unspent boxes
     * - call the getUnspentBoxes method
     * - assert unspentBoxes size must be equal to the TxPot unspent boxes plus node unspent boxes minus one spent box
     * @expected
     * - unspentBoxes size must be equal to 3
     */
    it<DataProviderTestContext>('should filter unspent boxes from node and TxPot when a box exists as spent and meanwhile unspent transactions', async ({
      boxLookup,
      dataProvider,
      txRepository,
    }) => {
      let unspentBoxesList = (
        await dataProvider['getUnspentBoxes'](
          Array.from(boxLookup.getRequests().values()),
        )
      ).unspentBoxes;
      expect(unspentBoxesList.map((ub) => ub.boxId)).toContain(
        SampleTxs[SampleTxs.length - 1].inputs[0].boxId,
      );
      expect(unspentBoxesList.map((ub) => ub.boxId)).not.toContain(
        SampleTxs[SampleTxs.length - 1].outputs[0].boxId,
      );

      // Insert already unspent boxes to the spent tx-pot boxes
      await txRepository.insert(SampleTransactionEntitiesContainsSpecialOutput);

      // Act
      unspentBoxesList = (
        await dataProvider['getUnspentBoxes'](
          Array.from(boxLookup.getRequests().values()),
        )
      ).unspentBoxes;
      expect(unspentBoxesList.map((ub) => ub.boxId)).not.toContain(
        SampleTxs[SampleTxs.length - 1].inputs[0].boxId,
      );
      expect(unspentBoxesList.map((ub) => ub.boxId)).toContain(
        SampleTxs[SampleTxs.length - 1].outputs[0].boxId,
      );
    });

    /**
     * should retrieve and combine unspent boxes from empty node and TxPot data
     * @scenario
     * - mock node api to return empty tx data
     * - call the getUnspentBoxes method
     * - assert unspentBoxes size must be equal to the TxPot unspent boxes plus node unspent boxes
     * @expected
     * - unspentBoxes size must be equal to 3
     */
    it<DataProviderTestContext>('should retrieve and combine unspent boxes from empty node and TxPot data', async ({
      boxLookup,
      dataProvider,
    }) => {
      // Mock
      (dataProvider as any)['getArrangedNodeBoxes'] = vi
        .fn()
        .mockImplementation(async () => {
          return { spentBoxes: [], unspentBoxes: [] };
        });

      // Act
      const unspentBoxesList = (
        await dataProvider['getUnspentBoxes'](
          Array.from(boxLookup.getRequests().values()),
        )
      ).unspentBoxes;

      // Assert
      expect((unspentBoxesList as ErgoTransactionOutput[]).length).toEqual(3);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([
        ...SampleTxs[0].outputs.map((box) => box.boxId),
        ...SampleTxs[1].outputs.map((box) => box.boxId),
        ...SampleTxs[2].outputs.map((box) => box.boxId),
      ]);
    });

    /**
     * should retrieve and combine unspent boxes from node and by empty TxPot data
     * @scenario
     * - remove total tx from TxPot DB
     * - call the getUnspentBoxes method
     * - assert unspentBoxes size must be equal to the TxPot unspent boxes plus node unspent boxes
     * @expected
     * - unspentBoxes size must be equal to 1
     */
    it<DataProviderTestContext>('should retrieve and combine unspent boxes from node and by empty TxPot data', async ({
      boxLookup,
      dataProvider,
      txRepository,
    }) => {
      // Empty TxPot DB data
      await txRepository.clear();

      // Act
      const unspentBoxesList = (
        await dataProvider['getUnspentBoxes'](
          Array.from(boxLookup.getRequests().values()),
        )
      ).unspentBoxes;

      // Assert
      expect((unspentBoxesList as ErgoTransactionOutput[]).length).toEqual(1);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      ]);
    });

    /**
     * should retrieve and combine unspent boxes from empty node and empty TxPot data
     * @scenario
     * - remove total tx from TxPot DB
     * - mock node api to return empty tx data
     * - call the getUnspentBoxes method
     * - assert unspentBoxes size must be equal to the TxPot unspent boxes plus node unspent boxes
     * @expected
     * - unspentBoxes size must be equal to 0
     */
    it<DataProviderTestContext>('should retrieve and combine unspent boxes from empty node and empty TxPot data', async ({
      boxLookup,
      dataProvider,
      txRepository,
    }) => {
      // Empty TxPot DB data
      await txRepository.clear();

      // Mock
      (dataProvider as any)['getArrangedNodeBoxes'] = async () => {
        return { spentBoxes: [], unspentBoxes: [] };
      };

      // Act
      const unspentBoxesList = (
        await dataProvider['getUnspentBoxes'](
          Array.from(boxLookup.getRequests().values()),
        )
      ).unspentBoxes;

      // Assert
      expect(unspentBoxesList.values.length).toEqual(0);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([]);
    });
  });
});
