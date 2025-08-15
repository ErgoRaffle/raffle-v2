/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

import { BoxLookup } from '../lib/boxLookup';
import {
  sampleTxPot,
  sampleNodeURL,
  sampleNetworkType,
  sampleRequests,
  sampleErgoBoxes,
  sampleMinedBoxes,
} from './mocked/boxLookup.mock';
import { TxPot } from '@rosen-bridge/tx-pot';

// Mock the BoxSelector module
vi.mock('../lib/boxSelector', () => ({
  BoxSelector: vi.fn(),
}));

describe('BoxLookup', () => {
  let boxLookup: BoxLookup;
  let mockLogger: DummyLogger;

  beforeEach(() => {
    mockLogger = new DummyLogger();
    boxLookup = new BoxLookup(
      sampleTxPot as unknown as TxPot,
      sampleNodeURL,
      sampleNetworkType,
      mockLogger,
    );
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('registerRequest', () => {
    /**
     * @target should register a new request and return assigned ID
     * @dependencies
     * @scenario
     * - call registerRequest with a valid request
     * - check if the request is stored with an ID
     * @expected
     * - should return a unique ID and store the request
     */
    it('should register a new request and return assigned ID', () => {
      const request = sampleRequests.validRequest;
      const requestId = boxLookup.registerRequest(request);

      expect(requestId).toBe(1);
      expect(boxLookup['requests'].has(requestId)).toBe(true);
      expect(boxLookup['requests'].get(requestId)).toEqual(request);
    });

    /**
     * @target should increment request ID counter for each registration
     * @dependencies
     * @scenario
     * - register multiple requests
     * - check if each gets a unique ID
     * @expected
     * - should assign incrementing IDs to each request
     */
    it('should increment request ID counter for each registration', () => {
      const request1 = sampleRequests.validRequest;
      const request2 = sampleRequests.ergOnlyRequest;

      const id1 = boxLookup.registerRequest(request1);
      const id2 = boxLookup.registerRequest(request2);

      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(boxLookup['requestsIdCounter']).toBe(2);
    });
  });

  describe('unregisterRequest', () => {
    /**
     * @target should unregister existing request and return it
     * @dependencies
     * @scenario
     * - register a request first
     * - unregister the request by its ID
     * @expected
     * - should remove the request and return it
     */
    it('should unregister existing request and return it', () => {
      const request = sampleRequests.validRequest;
      const requestId = boxLookup.registerRequest(request);

      const unregisteredRequest = boxLookup.unregisterRequest(requestId);

      expect(unregisteredRequest).toEqual(request);
      expect(boxLookup['requests'].has(requestId)).toBe(false);
    });

    /*
     * @target should return undefined for non-existent request ID
     * @dependencies
     * @scenario
     * - try to unregister a request with non-existent ID
     * @expected
     * - should return undefined and log the attempt
     */
    it('should return undefined for non-existent request ID', () => {
      const result = boxLookup.unregisterRequest(999);

      expect(result).toBeUndefined();
    });
  });

  describe('serveRequests', () => {
    beforeEach(async () => {
      // Import the mocked BoxSelector
      const { BoxSelector } = await import('../lib/boxSelector');

      // Set up the mock implementation
      vi.mocked(BoxSelector).mockImplementation(
        () =>
          ({
            isEligibleForSelection: vi.fn().mockReturnValue(true),
            addBox: vi.fn(),
            isCovering: vi.fn().mockReturnValue(true),
            getBoxes: vi
              .fn()
              .mockReturnValue([sampleErgoBoxes.validBoxWithTokens]),
          }) as any,
      );

      // Mock the DataProvider methods
      vi.spyOn(boxLookup['dataProvider'], 'startNewRound').mockResolvedValue(
        undefined,
      );
      vi.spyOn(
        boxLookup['dataProvider'],
        'updateRoundWithTxPotData',
      ).mockResolvedValue(undefined);
      vi.spyOn(
        boxLookup['dataProvider'],
        'getCurrentRoundState',
      ).mockReturnValue({
        spentBoxIds: new Set(['spent-box-1', 'spent-box-2']),
        unspentBoxes: [
          sampleErgoBoxes.validBoxWithTokens,
          sampleErgoBoxes.validBoxWithErgs,
        ],
      });
    });

    /**
     * @target should return early when no requests are registered
     * @dependencies
     * @scenario
     * - call serveRequests without registering any requests
     * @expected
     * - should return early without processing
     */
    it('should return early when no requests are registered', async () => {
      const dataProviderSpy = vi.spyOn(
        boxLookup['dataProvider'],
        'startNewRound',
      );

      await boxLookup.serveRequests();

      expect(dataProviderSpy).not.toHaveBeenCalled();
    });

    /**
     * @target should process registered requests and call onSuffice when covered
     * @dependencies
     * @scenario
     * - register a request with onSuffice callback
     * - call serveRequests
     * - check if onSuffice is called when boxes are covering
     * @expected
     * - should call onSuffice when request is covered
     */
    it('should process registered requests and call onSuffice when covered', async () => {
      const mockOnSuffice = vi.fn().mockResolvedValue(undefined);
      const request = {
        ...sampleRequests.validRequest,
        onSuffice: mockOnSuffice,
        getConfirmedBoxes: vi.fn().mockResolvedValue(sampleMinedBoxes),
      };

      const requestId = boxLookup.registerRequest(request);

      await boxLookup.serveRequests();

      expect(mockOnSuffice).toHaveBeenCalledWith(
        [sampleErgoBoxes.validBoxWithTokens],
        expect.any(Array),
        requestId,
      );
    });

    /**
     * @target should handle multiple requests in sequence
     * @dependencies
     * @scenario
     * - register multiple requests
     * - call serveRequests
     * - check if all requests are processed
     * @expected
     * - should process all registered requests
     */
    it('should handle multiple requests in sequence', async () => {
      const mockOnSuffice1 = vi.fn().mockResolvedValue(undefined);
      const mockOnSuffice2 = vi.fn().mockResolvedValue(undefined);

      const request1 = {
        ...sampleRequests.validRequest,
        onSuffice: mockOnSuffice1,
        getConfirmedBoxes: vi.fn().mockResolvedValue(sampleMinedBoxes),
      };
      const request2 = {
        ...sampleRequests.ergOnlyRequest,
        onSuffice: mockOnSuffice2,
        getConfirmedBoxes: vi.fn().mockResolvedValue(sampleMinedBoxes),
      };

      boxLookup.registerRequest(request1);
      boxLookup.registerRequest(request2);

      await boxLookup.serveRequests();

      expect(mockOnSuffice1).toHaveBeenCalled();
      expect(mockOnSuffice2).toHaveBeenCalled();
    });

    /**
     * @target should handle errors in onSuffice callback gracefully
     * @dependencies
     * @scenario
     * - register a request with onSuffice that throws an error
     * - call serveRequests
     * @expected
     * - should handle the error without breaking the process
     */
    it('should handle errors in onSuffice callback gracefully', async () => {
      const mockOnSuffice = vi
        .fn()
        .mockRejectedValue(new Error('Callback error'));
      const request = {
        ...sampleRequests.validRequest,
        onSuffice: mockOnSuffice,
        getConfirmedBoxes: vi.fn().mockResolvedValue(sampleMinedBoxes),
      };

      boxLookup.registerRequest(request);

      // Should not throw an error
      await expect(boxLookup.serveRequests()).resolves.not.toThrow();
    });
  });
});
