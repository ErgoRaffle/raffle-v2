import { vi, it, beforeEach, describe, expect, Mock } from 'vitest';
import { TransactionEntity, TxPot } from '@rosen-bridge/tx-pot';

import { BoxLookup } from '../lib/boxLookup';
import { Request } from '../lib/types/request';
import {
  mockDataSource,
  SampleTransactionEntities,
  unconfirmedTxList,
} from './mocked/boxLookup.mock';
import { Repository } from 'typeorm';
import { ErgoTransactionOutput, Transactions } from '@rosen-clients/ergo-node';
import { ErgoAddress, Network, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';

interface BoxLookupTestContext {
  txRepository: Repository<TransactionEntity>;
  txPot: TxPot;
  boxLookup: BoxLookup;
  request: Request;
  request2: Request;
}

beforeEach<BoxLookupTestContext>(async (context) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(1685894400001));

  const dataSource = await mockDataSource();
  const txPot = TxPot.setup(dataSource);
  const txRepository = dataSource.getRepository(TransactionEntity);
  await txRepository.insert(SampleTransactionEntities);
  const boxLookup = new BoxLookup(
    txPot,
    'http://127.0.0.1:9052/',
    Network.Mainnet,
  );
  vi.spyOn(
    boxLookup['nodeAPI'],
    'getUnconfirmedTransactions',
  ).mockResolvedValue(unconfirmedTxList as unknown as Transactions);

  context.txRepository = txRepository;
  context.txPot = txPot;
  context.boxLookup = boxLookup;
  context.request = {} as Request;
  context.request2 = {} as Request;
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

  describe('getUnspentBoxes', () => {
    /**
     * should retrieve and combine spent boxes from node and TxPot
     * @scenario
     * - call the getUnspentBoxes method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 4
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from node and TxPot', async ({
      boxLookup,
    }) => {
      // Act
      const unspentBoxesList = await boxLookup['getUnspentBoxes']();

      // Assert
      expect((unspentBoxesList as ErgoTransactionOutput[]).length).toEqual(4);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd122',
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd124',
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd125',
      ]);
    });

    /**
     * should retrieve and combine spent boxes from empty node and TxPot data
     * @scenario
     * - mock node api to return empty tx data
     * - call the getUnspentBoxes method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 0
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from empty node and TxPot data', async ({
      boxLookup,
    }) => {
      // Mock
      vi.spyOn(
        boxLookup['nodeAPI'],
        'getUnconfirmedTransactions',
      ).mockImplementation(async () => []);

      // Act
      const unspentBoxesList = await boxLookup['getUnspentBoxes']();

      // Assert
      expect((unspentBoxesList as ErgoTransactionOutput[]).length).toEqual(3);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd122',
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd124',
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd125',
      ]);
    });

    /**
     * should retrieve and combine spent boxes from node and by empty TxPot data
     * @scenario
     * - remove total tx from TxPot DB
     * - call the getUnspentBoxes method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 1
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from node and by empty TxPot data', async ({
      boxLookup,
      txRepository,
    }) => {
      // Empty TxPot DB data
      await txRepository.clear();

      // Act
      const unspentBoxesList = await boxLookup['getUnspentBoxes']();

      // Assert
      expect((unspentBoxesList as ErgoTransactionOutput[]).length).toEqual(1);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([
        '1ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
      ]);
    });

    /**
     * should retrieve and combine spent boxes from empty node and empty TxPot data
     * @scenario
     * - remove total tx from TxPot DB
     * - mock node api to return empty tx data
     * - call the getUnspentBoxes method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 0
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from empty node and empty TxPot data', async ({
      boxLookup,
      txRepository,
    }) => {
      // Empty TxPot DB data
      await txRepository.clear();

      // Mock
      vi.spyOn(
        boxLookup['nodeAPI'],
        'getUnconfirmedTransactions',
      ).mockImplementation(async () => []);

      // Act
      const unspentBoxesList = await boxLookup['getUnspentBoxes']();

      // Assert
      expect(unspentBoxesList.values.length).toEqual(0);
      expect(
        (unspentBoxesList as ErgoTransactionOutput[]).map((box) => box.boxId),
      ).toEqual([]);
    });
  });

  describe('serveRequests', () => {
    interface ServeRequestsInterface {
      boxLookup: BoxLookup;
      mockOnSuffice: () => Promise<void>;
    }

    beforeEach<ServeRequestsInterface>((context) => {
      const mockTxPot = {
        getTxsByStatus: vi.fn().mockResolvedValue([]),
      } as unknown as TxPot;
      const mockOnSuffice = vi.fn();
      const boxLookup = new BoxLookup(
        mockTxPot,
        'http://127.0.0.1:9052',
        Network.Mainnet,
      );

      // mock getUnspentBoxes manually to insert desired boxes
      (
        boxLookup as unknown as {
          getUnspentBoxes: () => Promise<
            Array<Set<string> | ErgoTransactionOutput[]>
          >;
        }
      )['getUnspentBoxes'] = async () => {
        return JSON.parse(SampleTransactionEntities[0].serializedTx).outputs;
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
      });

      mockOnSuffice.mockClear();

      context.boxLookup = boxLookup;
      context.mockOnSuffice = mockOnSuffice;
    });

    /**
     * request callback must fired when sufficient token is found in unspent boxes
     * @scenario
     * - mock a transaction containing the required token with sufficient amount
     * - register a request with a matching token and amount
     * - run the boxLookup job
     * - stop the job and wait for it to finish
     * @expected
     * - onSuffice callback must be called exactly once
     */
    it<ServeRequestsInterface>('request callback must fired when sufficient token is found in unspent boxes', async ({
      boxLookup,
      mockOnSuffice,
    }) => {
      await boxLookup.serveRequests();
      expect(mockOnSuffice).toBeCalledTimes(1);
      expect((mockOnSuffice as Mock).mock.calls[0]).toEqual([
        [JSON.parse(SampleTransactionEntities[0].serializedTx).outputs[0]],
      ]);
    });

    /**
     * request callback must fired when sufficient ergs is found in unspent boxes
     * @scenario
     * - mock a transaction containing the required ergs with sufficient amount
     * - register a request with a matching erg amount
     * - run the boxLookup job
     * - stop the job and wait for it to finish
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
      });

      await boxLookup.serveRequests();
      expect(mockOnSuffice).toBeCalledTimes(1);
      expect((mockOnSuffice as Mock).mock.calls[0]).toEqual([
        [JSON.parse(SampleTransactionEntities[0].serializedTx).outputs[0]],
      ]);
    });

    /**
     * request callback must fired when sufficient ergs and token is found in unspent boxes
     * @scenario
     * - mock a transaction containing the required ergs and token with sufficient amount
     * - register a request with a matching erg and token amount
     * - run the boxLookup job
     * - stop the job and wait for it to finish
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
      });

      await boxLookup.serveRequests();
      expect(mockOnSuffice).toBeCalledTimes(1);
      expect((mockOnSuffice as Mock).mock.calls[0]).toEqual([
        [JSON.parse(SampleTransactionEntities[0].serializedTx).outputs[0]],
      ]);
    });

    /**
     * does not call onSuffice if box has insufficient token amount
     * @scenario
     * - add a second request requiring more tokens than available in the mocked box
     * - run and stop the boxLookup job
     * @expected
     * - onSuffice should only be called once (for the first request)
     */
    it<ServeRequestsInterface>('does not call onSuffice if box has insufficient token amount', async ({
      boxLookup,
    }) => {
      const mockOnSuffice = vi.fn();
      boxLookup['requests'].set(2, {
        address: ErgoAddress.fromErgoTree(
          '0008cd0336100ef59ced80ba5f89c4178ebd57b6c1dd0f3d135ee1db9f62fc634d637041',
        ).toString(),
        value: 0,
        tokens: [
          {
            tokenId:
              '4ab9da11fc216660e974842cc3b7705e62ebb9e0bf5ff78e53f9cd40abadd117',
            amount: 200n,
          },
        ],
        onSuffice: mockOnSuffice,
      });

      await boxLookup.serveRequests();

      expect(mockOnSuffice).toHaveBeenCalledTimes(0);
    });
  });
});
