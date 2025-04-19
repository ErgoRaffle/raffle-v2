import { it, beforeEach, describe, expect } from 'vitest';
import { TxPot } from '@rosen-bridge/tx-pot';

import { BoxLookup } from '../lib/boxLookup';
import { Request } from '../lib/types/request';

interface BoxLookupTestContext {
  txPot: TxPot;
  boxLookup: BoxLookup;
  request: Request;
  request2: Request;
}

beforeEach<BoxLookupTestContext>(async (context) => {
  const txPot = {} as TxPot;
  context.txPot = txPot;
  context.boxLookup = new BoxLookup(txPot);
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
});
