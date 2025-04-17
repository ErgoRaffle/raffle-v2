import { it, beforeEach, describe, expect } from 'vitest';
import { TxPot } from '@rosen-bridge/tx-pot';

import { BoxLookup } from '../lib/boxLookup';
import { Request } from '../lib/types/request';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

interface BoxLookupTestContext {
  txPot: TxPot;
  boxLookup: BoxLookup;
  request: Request;
  request2: Request;
}

beforeEach<BoxLookupTestContext>(async (context) => {
  const txPot = {} as TxPot;
  context.txPot = txPot;
  context.boxLookup = new BoxLookup(txPot, new DummyLogger());
  context.request = {} as Request;
  context.request2 = {} as Request;
});

describe('BoxLookup', () => {
  describe('registerRequest', () => {
    /**
     * @target increment requestsIdCounter and store the request when registerRequest is called
     * @scenario
     * - create required objects for test scenario
     * - register a request and put return id to a variable
     * - assert returned id is exists
     * - register another request
     * - assert second returned id is exists
     * @expected
     * - it should confirm all requests exist by their Ids
     */
    it<BoxLookupTestContext>('should increment requestsIdCounter and store the request when registerRequest is called', ({
      boxLookup,
      request,
      request2,
    }) => {
      // Act
      const requestId = boxLookup.registerRequest(request);

      // Assert
      expect(requestId).toBe(1);
      expect(boxLookup['requests'].get(1)).toBe(request);

      // Act again to verify counter increments
      const requestId2 = boxLookup.registerRequest(request2);

      // Assert again
      expect(requestId2).toBe(2);
      expect(boxLookup['requests'].get(2)).toBe(request2);
    });
  });

  describe('unregisterRequest', () => {
    /**
     * @target set request to undefined when unregisterRequest is called with existing requestId
     * @scenario
     * - create required objects for test scenario
     * - register a request and put return id to a variable
     * - unregister request by returned id
     * - assert returned value of unregister method is equal to original request object
     * - assert request removed from the requests attribute of the boxLookup
     * @expected
     * - the requests attribute of the boxLookup object must be empty
     */
    it<BoxLookupTestContext>('should set request to undefined when unregisterRequest is called with existing requestId', ({
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
     * @target do nothing when unregisterRequest is called with ID greater than requestsIdCounter
     * @scenario
     * - create required objects for test scenario
     * - register a request and put return id to a variable
     * - unregister request by invalid id
     * - assert returned value of unregister method is undefined
     * - assert size of request attribute of the boxLookup object 1
     * - assert existing item of request from the boxLookup is equal to original request object
     * @expected
     * - request from the boxLookup must contains one item
     */
    it<BoxLookupTestContext>('should do nothing when unregisterRequest is called with ID greater than requestsIdCounter', ({
      boxLookup,
      request,
    }) => {
      // Register a request to set requestsIdCounter to 1
      boxLookup.registerRequest(request);

      // Act - Try to unregister a request with ID > requestsIdCounter
      const result = boxLookup.unregisterRequest(2);

      // Assert
      expect(result).toBeUndefined();
      expect(boxLookup['requests'].size).toBe(1);
      expect(boxLookup['requests'].get(1)).toBe(request);
    });

    /**
     * @target do nothing when unregisterRequest is called with negative ID
     * @scenario
     * - create required objects for test scenario
     * - register a request and put return id to a variable
     * - unregister request by invalid negative id
     * - assert returned value of unregister method is undefined
     * - assert size of request attribute of the boxLookup object is 1
     * - assert existing item of request from the boxLookup is equal to original request object
     * @expected
     * - request from the boxLookup must contain one item
     */
    it<BoxLookupTestContext>('should do nothing when unregisterRequest is called with negative ID', ({
      boxLookup,
      request,
    }) => {
      // Register a request to set requestsIdCounter to 1
      boxLookup.registerRequest(request);

      // Act - Try to unregister a request with negative ID
      const result = boxLookup.unregisterRequest(-1);

      // Assert
      expect(result).toBeUndefined();
      expect(boxLookup['requests'].size).toBe(1);
      expect(boxLookup['requests'].get(1)).toBe(request);
    });
  });
});
