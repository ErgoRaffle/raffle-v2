import { vi, it, beforeEach, describe, expect } from 'vitest';
import { TransactionEntity, TxPot } from '@rosen-bridge/tx-pot';

import { BoxLookup } from '../lib/boxLookup';
import { Request } from '../lib/types/request';
import {
  mockDataSource,
  SampleTransactionEntities,
  unconfirmedTxList,
} from './mocked/boxLookup.mock';
import { Repository } from 'typeorm';

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
  const boxLookup = new BoxLookup(txPot, 'http://127.0.0.1:9052/');
  vi.spyOn(boxLookup['nodeAPI'], 'get').mockImplementation(async (url) => {
    if (url == '/transactions/unconfirmed')
      return {
        data: unconfirmedTxList,
        status: 200,
      };

    return {
      status: 200,
      data: { inputs: [{ boxId: url.split('/')[url.split('/').length - 1] }] },
    };
  });

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

  describe('updateSpentBoxesList', () => {
    /**
     * should retrieve and combine spent boxes from node and TxPot
     * @scenario
     * - call the updateSpentBoxesList method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 4
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from node and TxPot', async ({
      boxLookup,
    }) => {
      // Act
      await boxLookup['updateSpentBoxesList']();

      // Assert
      expect(boxLookup.getSpentBoxesList().length).toEqual(4);
    });

    /**
     * should retrieve and combine spent boxes from node and by empty TxPot data
     * @scenario
     * - remove total tx from TxPot DB
     * - call the updateSpentBoxesList method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 1
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from node and by empty TxPot data', async ({
      boxLookup,
      txRepository,
    }) => {
      // Empty TxPot DB data
      txRepository.clear();

      // Act
      await boxLookup['updateSpentBoxesList']();

      // Assert
      expect(boxLookup.getSpentBoxesList().length).toEqual(1);
    });

    /**
     * should retrieve and combine spent boxes from TxPot and by empty node data
     * @scenario
     * - mock node api to return empty tx data
     * - call the updateSpentBoxesList method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 3
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from TxPot and by empty node data', async ({
      boxLookup,
    }) => {
      // Mock
      vi.spyOn(boxLookup['nodeAPI'], 'get').mockImplementation(async (url) => {
        if (url == '/transactions/unconfirmed')
          return {
            data: [],
            status: 200,
          };

        return {
          status: 200,
          data: {
            inputs: [{ boxId: url.split('/')[url.split('/').length - 1] }],
          },
        };
      });

      // Act
      await boxLookup['updateSpentBoxesList']();

      // Assert
      expect(boxLookup.getSpentBoxesList().length).toEqual(3);
    });

    /**
     * should retrieve and combine spent boxes from TxPot and by empty node data
     * @scenario
     * - remove total tx from TxPot DB
     * - mock node api to return empty tx data
     * - call the updateSpentBoxesList method
     * - assert spentBoxes size must be equal to the TxPot spent boxes plus node spent boxes
     * @expected
     * - spentBoxes size must be equal to 0
     */
    it<BoxLookupTestContext>('should retrieve and combine spent boxes from TxPot and by empty node data', async ({
      boxLookup,
      txRepository,
    }) => {
      // Empty TxPot DB data
      txRepository.clear();

      // Mock
      vi.spyOn(boxLookup['nodeAPI'], 'get').mockImplementation(async (url) => {
        if (url == '/transactions/unconfirmed')
          return {
            data: [],
            status: 200,
          };

        return {
          status: 200,
          data: {
            inputs: [{ boxId: url.split('/')[url.split('/').length - 1] }],
          },
        };
      });

      // Act
      await boxLookup['updateSpentBoxesList']();

      // Assert
      expect(boxLookup.getSpentBoxesList().length).toEqual(0);
    });
  });
});
