/* eslint-disable @typescript-eslint/no-explicit-any */

import { vi, it, beforeEach, describe, expect, Mock } from 'vitest';
import { TransactionEntity, TxPot } from '@rosen-bridge/tx-pot';

import { BoxLookup } from '../lib/boxLookup';
import { Request } from '../lib/types/request';
import {
  mockDataSource,
  SampleTransactionEntities,
  SampleTxs,
  unconfirmedTxList,
} from './mocked/boxLookup.mock';
import { Repository } from 'typeorm';
import { Transactions } from '@rosen-clients/ergo-node';
import {
  ErgoAddress,
  ErgoBox,
  Network,
  SAFE_MIN_BOX_VALUE,
} from '@fleet-sdk/core';
import { afterEach } from 'node:test';
import { DataProvider } from '../lib/dataProvider';

interface BoxLookupTestContext {
  txRepository: Repository<TransactionEntity>;
  txPot: TxPot;
  dataProvider: DataProvider;
  boxLookup: BoxLookup;
  request: Request;
  request2: Request;
}

beforeEach<BoxLookupTestContext>(async (context) => {
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
  context.request2 = {} as Request;
});

afterEach(async () => {
  vi.restoreAllMocks();
});

describe('BoxLookup', () => {
  describe('registerRequest', () => {
    /**
     * @target should exists registered request after registering one Request
     * @scenario
     * - register a request and put return id to a variable
     * - assert returned id is exists
     * @expected
     * - returned value of registered request must equal to 1
     * - it should confirm stored request exist by their Id
     */
    it<BoxLookupTestContext>('should exists registered request after registering one Request', ({
      boxLookup,
      request,
    }) => {
      // Act
      const requestId = boxLookup.registerRequest(request);

      // Assert
      expect(requestId).toBe(1);
      expect(boxLookup['requests'].get(1)).toBe(request);
    });

    /**
     * @target should exists second registered request after registering two Requests
     * @scenario
     * - register two request instances and put return ids to related variables
     * - assert returned id of second call of the registerRequest equal to old id plus one
     * - assert second returned id is exists
     * @expected
     * - returned value of second registered request must equal to old id plus one
     * - it should confirm second stored request exist by their Id
     */
    it<BoxLookupTestContext>('should exists second registered request after registering two Requests', ({
      boxLookup,
      request,
      request2,
    }) => {
      // Act
      const requestId = boxLookup.registerRequest(request);
      const requestId2 = boxLookup.registerRequest(request2);

      // Assert
      expect(requestId2).toBe(requestId + 1);
      expect(boxLookup['requests'].get(2)).toBe(request2);
    });
  });

  describe('unregisterRequest', () => {
    /**
     * @target should unregister Request instance by related id
     * @scenario
     * - register a request and put return id to a variable
     * - unregister request by returned id
     * - assert returned value of unregister method is equal to original request object
     * - assert request removed from the requests attribute of the boxLookup
     * @expected
     * - the returned value of unregister must be equal to original request instance
     * - the requests attribute of the boxLookup object must be empty
     */
    it<BoxLookupTestContext>('should unregister Request instance by related id', ({
      boxLookup,
      request,
    }) => {
      // Act - Try to unregister a request
      const requestId = boxLookup.registerRequest(request);
      const result = boxLookup.unregisterRequest(requestId);

      // Assert
      expect(result).toBe(request);
      expect(boxLookup['requests'].get(requestId)).toBeUndefined();
    });

    /**
     * @target should do nothing when try to unregister Request that not exists
     * @scenario
     * - call unregister request method by invalid id
     * - assert returned value of unregister method is undefined
     * - assert size of request attribute of the boxLookup object is 0
     * @expected
     * - returned value of unregister method must be undefined
     * - request from the boxLookup must contains zero items
     */
    it<BoxLookupTestContext>('should do nothing when try to unregister Request that not exists', ({
      boxLookup,
    }) => {
      // Act - Try to unregister a request with ID > requestsIdCounter
      const result = boxLookup.unregisterRequest(100);

      // Assert
      expect(result).toBeUndefined();
      expect(boxLookup['requests'].size).toBe(0);
    });
  });

  describe('serveRequests', () => {
    interface ServeRequestsInterface {
      boxLookup: BoxLookup;
      dataProvider: DataProvider;
      mockOnSuffice: () => Promise<void>;
    }

    beforeEach<ServeRequestsInterface>(async (context) => {
      const mockOnSuffice = vi.fn();
      const dataSource = await mockDataSource();
      const dataProvider = new DataProvider(
        dataSource,
        'http://127.0.0.1:9052',
      );
      (dataProvider as any).txPot = {
        getTxsByStatus: vi.fn().mockResolvedValue([]),
      } as unknown as TxPot;

      const boxLookup = new BoxLookup(dataProvider, Network.Mainnet);

      // mock getUnspentBoxes manually to insert desired boxes
      dataProvider['getUnspentBoxes'] = async () => {
        return SampleTxs[0].outputs.map((outBox) => new ErgoBox(outBox));
      };

      // register request
      boxLookup['requests'].set(1, {
        address: ErgoAddress.fromErgoTree(
          '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
        ).toString(),
        value: 0,
        tokens: [
          {
            tokenId:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            amount: 50n,
          },
        ],
        onSuffice: mockOnSuffice,
        getMinedUnspentBoxes: async () => {
          return [];
        },
      });

      mockOnSuffice.mockClear();

      context.boxLookup = boxLookup;
      context.dataProvider = dataProvider;
      context.mockOnSuffice = mockOnSuffice;
    });

    /**
     * request callback must fired when sufficient token is found in unspent boxes
     * @scenario
     * - run the boxLookup job
     * @expected
     * - onSuffice callback must be called exactly once
     */
    it<ServeRequestsInterface>('request callback must fired when sufficient token is found in unspent boxes', async ({
      boxLookup,
      mockOnSuffice,
    }) => {
      await boxLookup.serveRequests();
      expect(mockOnSuffice).toBeCalledTimes(1);
      expect(mockOnSuffice).toBeCalledWith(
        [new ErgoBox(SampleTxs[0].outputs[0])],
        [new ErgoBox(SampleTxs[0].outputs[0])],
      );
    });

    /**
     * request callback must fired when sufficient token is found in unspent boxes multiple times
     * @scenario
     * - mock a transaction containing the required token with more than one sufficient amount
     * - run the boxLookup job
     * @expected
     * - onSuffice callback must be called exactly once
     */
    it<ServeRequestsInterface>('request callback must fired when sufficient token is found in unspent boxes multiple times', async ({
      boxLookup,
      dataProvider,
      mockOnSuffice,
    }) => {
      // mock getUnspentBoxes manually to insert desired boxes
      dataProvider['getUnspentBoxes'] = async () => {
        return [
          ...(SampleTxs[0].outputs as ErgoBox[]),
          ...(SampleTxs[1].outputs as ErgoBox[]),
          ...(SampleTxs[2].outputs as ErgoBox[]),
        ];
      };

      await boxLookup.serveRequests();
      expect(mockOnSuffice).toBeCalledTimes(2);
      expect(mockOnSuffice).toBeCalledWith(
        [SampleTxs[0].outputs[0]],
        [
          ...(SampleTxs[0].outputs as ErgoBox[]),
          ...(SampleTxs[1].outputs as ErgoBox[]),
          ...(SampleTxs[2].outputs as ErgoBox[]),
        ],
      );
      expect(mockOnSuffice).toBeCalledWith(
        [SampleTxs[1].outputs[0]],
        [
          ...(SampleTxs[0].outputs as ErgoBox[]),
          ...(SampleTxs[1].outputs as ErgoBox[]),
          ...(SampleTxs[2].outputs as ErgoBox[]),
        ],
      );
    });

    /**
     * request callback must fired when sufficient ergs is found in unspent boxes
     * @scenario
     * - mock a transaction containing the required ergs with sufficient amount
     * - register a request with a matching erg amount
     * - run the boxLookup job
     * @expected
     * - onSuffice callback must be called exactly once
     */
    it<ServeRequestsInterface>('request callback must fired when sufficient ergs is found in unspent boxes', async ({
      boxLookup,
      mockOnSuffice,
    }) => {
      boxLookup['requests'].clear();
      // Mock register request
      boxLookup['requests'].set(1, {
        address: ErgoAddress.fromErgoTree(
          '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
        ).toString(),
        value: Number(SAFE_MIN_BOX_VALUE * 3n),
        tokens: [],
        onSuffice: mockOnSuffice,
        getMinedUnspentBoxes: async () => [],
      });

      await boxLookup.serveRequests();
      expect(mockOnSuffice).toBeCalledTimes(1);
      expect(mockOnSuffice as Mock).toBeCalledWith(
        [new ErgoBox(SampleTxs[0].outputs[0])],
        [new ErgoBox(SampleTxs[0].outputs[0])],
      );
    });

    /**
     * request callback must fired when sufficient ergs and token is found in unspent boxes
     * @scenario
     * - mock a transaction containing the required ergs and token with sufficient amount
     * - register a request with a matching erg and token amount
     * - run the boxLookup job
     * @expected
     * - onSuffice callback must be called exactly once
     */
    it<ServeRequestsInterface>('request callback must fired when sufficient ergs and token is found in unspent boxes', async ({
      boxLookup,
      mockOnSuffice,
    }) => {
      boxLookup['requests'].clear();
      // Mock register request
      boxLookup['requests'].set(1, {
        address: ErgoAddress.fromErgoTree(
          '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
        ).toString(),
        value: Number(SAFE_MIN_BOX_VALUE * 2n),
        tokens: [
          {
            tokenId:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            amount: 50n,
          },
        ],
        onSuffice: mockOnSuffice,
        getMinedUnspentBoxes: async () => [],
      });

      await boxLookup.serveRequests();
      expect(mockOnSuffice).toBeCalledTimes(1);
      expect(mockOnSuffice as Mock).toBeCalledWith(
        [new ErgoBox(SampleTxs[0].outputs[0])],
        [new ErgoBox(SampleTxs[0].outputs[0])],
      );
    });

    /**
     * does not call onSuffice if box has insufficient token amount
     * @scenario
     * - add a second request requiring more tokens than available in the mocked box
     * - run and stop the boxLookup job
     * @expected
     * - onSuffice should not be called
     */
    it<ServeRequestsInterface>('does not call onSuffice if box has insufficient token amount', async ({
      boxLookup,
    }) => {
      const mockOnSuffice = vi.fn();
      boxLookup['requests'].set(1, {
        address: ErgoAddress.fromErgoTree(
          '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
        ).toString(),
        value: 0,
        tokens: [
          {
            tokenId:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd000',
            amount: 200n,
          },
        ],
        onSuffice: mockOnSuffice,
        getMinedUnspentBoxes: async () => [],
      });

      await boxLookup.serveRequests();

      expect(mockOnSuffice).toHaveBeenCalledTimes(0);
    });
  });
});
