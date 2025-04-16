import { it, describe, expect } from 'vitest';
import { TxPot } from '@rosen-bridge/tx-pot';

import { BoxLookup } from '../lib/boxLookup';
import { AbstractLookupRequest } from '../lib/abstractRequest';
import { getBoxLookupRequest } from './utils';

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
     * - it should exists all of requests by ids
     */
    it('should increment requestsIdCounter and store the request when registerRequest is called', () => {
      // Arrange
      const txPot = {} as TxPot;
      const boxLookup = new BoxLookup(txPot);
      const request = {} as AbstractLookupRequest;
      const request2 = {} as AbstractLookupRequest;

      // Act
      const requestId = boxLookup.registerRequest(request);

      // Assert
      expect(requestId).toBe(1);
      expect(getBoxLookupRequest(boxLookup).get(1)).toBe(request);

      // Act again to verify counter increments
      const requestId2 = boxLookup.registerRequest(request2);

      // Assert again
      expect(requestId2).toBe(2);
      expect(getBoxLookupRequest(boxLookup).get(2)).toBe(request2);
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
    it('should set request to undefined when unregisterRequest is called with existing requestId', () => {
      // Arrange
      const txPot = {} as TxPot;
      const boxLookup = new BoxLookup(txPot);
      const request = {} as AbstractLookupRequest;

      // Act - Try to unregister a request
      const requestId = boxLookup.registerRequest(request);
      const result = boxLookup.unregisterRequest(requestId);

      // Assert
      expect(result).toBe(request);
      expect(getBoxLookupRequest(boxLookup).get(requestId)).toBeUndefined();
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
    it('should do nothing when unregisterRequest is called with ID greater than requestsIdCounter', () => {
      // Arrange
      const txPot = {} as TxPot;
      const boxLookup = new BoxLookup(txPot);
      const request = {} as AbstractLookupRequest;

      // Register a request to set requestsIdCounter to 1
      boxLookup.registerRequest(request);

      // Act - Try to unregister a request with ID > requestsIdCounter
      const result = boxLookup.unregisterRequest(2);

      // Assert
      expect(result).toBeUndefined();
      expect(getBoxLookupRequest(boxLookup).size).toBe(1);
      expect(getBoxLookupRequest(boxLookup).get(1)).toBe(request);
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
    it('should do nothing when unregisterRequest is called with negative ID', () => {
      // Arrange
      const txPot = {} as TxPot;
      const boxLookup = new BoxLookup(txPot);
      const request = {} as AbstractLookupRequest;

      // Register a request to set requestsIdCounter to 1
      boxLookup.registerRequest(request);

      // Act - Try to unregister a request with negative ID
      const result = boxLookup.unregisterRequest(-1);

      // Assert
      expect(result).toBeUndefined();
      expect(getBoxLookupRequest(boxLookup).size).toBe(1);
      expect(getBoxLookupRequest(boxLookup).get(1)).toBe(request);
    });
  });
});
