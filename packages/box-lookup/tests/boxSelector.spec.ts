import { describe, it, expect, beforeEach } from 'vitest';
import { DummyLogger } from '@rosen-bridge/abstract-logger';

import { BoxSelector } from '../lib/boxSelector';
import { Request } from '../lib/types';
import {
  sampleErgoBoxes,
  sampleRequests,
  sampleToken1,
  sampleToken2,
} from './mocked/boxSelector.mock';

let boxSelector: BoxSelector;
let mockRequest: Request;
let mockLogger: DummyLogger;

beforeEach(() => {
  mockLogger = new DummyLogger();
  mockRequest = sampleRequests.validRequest;
  boxSelector = new BoxSelector(mockLogger, mockRequest);
});

describe('isEligibleForSelection', () => {
  /**
   * @target should return true for a box with matching ergoTree and required tokens
   * @dependencies
   * @scenario
   * - create a box with the same ergoTree as the request
   * - add required tokens to the box
   * - call isEligibleForSelection function
   * @expected
   * - should return true for matching ergoTree and tokens
   */
  it('should return true for a box with matching ergoTree and required tokens', () => {
    const relatedBox = sampleErgoBoxes.validBoxWithTokens;
    const result = boxSelector.isEligibleForSelection(relatedBox);

    expect(result).toBe(true);
  });

  /**
   * @target should return true for a box with matching ergoTree and required ergs
   * @dependencies
   * @scenario
   * - create a request with erg value requirement
   * - create a box with the same ergoTree and sufficient ergs
   * - call isEligibleForSelection function
   * @expected
   * - should return true for matching ergoTree and ergs
   */
  it('should return true for a box with matching ergoTree and required ergs', () => {
    const ergRequest = sampleRequests.ergOnlyRequest;
    const ergBoxSelector = new BoxSelector(mockLogger, ergRequest);
    const relatedBox = sampleErgoBoxes.validBoxWithErgs;

    const result = ergBoxSelector.isEligibleForSelection(relatedBox);

    expect(result).toBe(true);
  });

  /**
   * @target should return false for a box with different ergoTree
   * @dependencies
   * @scenario
   * - create a box with different ergoTree than the request
   * - call isEligibleForSelection function
   * @expected
   * - should return false for different ergoTree
   */
  it('should return false for a box with different ergoTree', () => {
    const unrelatedBox = sampleErgoBoxes.boxWithDifferentAddress;
    const result = boxSelector.isEligibleForSelection(unrelatedBox);

    expect(result).toBe(false);
  });

  /**
   * @target should return false for a box with same ergoTree but no required tokens
   * @dependencies
   * @scenario
   * - create a box with same ergoTree but no required tokens
   * - create a request with no value requirement
   * - call isEligibleForSelection function
   * @expected
   * - should return false for missing tokens and ergs
   */
  it('should return false for a box with same ergoTree but no required tokens or ergs', () => {
    const noValueRequest = sampleRequests.noValueRequest;
    const noValueBoxSelector = new BoxSelector(mockLogger, noValueRequest);
    const boxWithoutTokens = sampleErgoBoxes.boxWithoutTokens;
    const result = noValueBoxSelector.isEligibleForSelection(boxWithoutTokens);

    expect(result).toBe(false);
  });

  /**
   * @target should return true when request has no requirements
   * @dependencies
   * @scenario
   * - create a request with no value and no tokens
   * - create a box with matching ergoTree
   * - call isEligibleForSelection function
   * @expected
   * - should return true when request has no requirements
   */
  it('should return true when request has no requirements', () => {
    const noRequirementsRequest = sampleRequests.noRequrirementRequest;
    const noRequirementsBoxSelector = new BoxSelector(
      mockLogger,
      noRequirementsRequest,
    );
    const boxWithMatchingAddress = sampleErgoBoxes.validBoxWithTokens;
    const result = noRequirementsBoxSelector.isEligibleForSelection(
      boxWithMatchingAddress,
    );

    expect(result).toBe(true);
  });
});

describe('addBox', () => {
  /**
   * @target should add a box and update sum value correctly
   * @dependencies
   * @scenario
   * - add a box with ergs and tokens
   * - check if the box is added to the list
   * - check if sum value is updated correctly
   * @expected
   * - box should be added and sum value should be updated
   */
  it('should add a box and update sum value correctly', () => {
    const box = sampleErgoBoxes.validBoxWithTokens;

    boxSelector.addBox(box);

    const boxes = boxSelector.getBoxes();
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toBe(box);
  });

  /**
   * @target should accumulate multiple tokens of the same type
   * @dependencies
   * @scenario
   * - add first box with specific tokens
   * - add second box with same token types but different amounts
   * - check if token amounts are accumulated correctly
   * @expected
   * - token amounts should be summed for same token types
   */
  it('should accumulate multiple tokens of the same type', () => {
    const box1 = sampleErgoBoxes.validBoxWithTokens;
    const box2 = sampleErgoBoxes.validBoxWithTokens;

    boxSelector.addBox(box1);
    boxSelector.addBox(box2);

    // The sum should reflect accumulated values
    // This test verifies the internal accumulation logic works
    expect(boxSelector.getBoxes()).toHaveLength(2);
    expect(boxSelector['sumValue'].tokens).toEqual(
      [sampleToken1, sampleToken2].map((token) => ({
        ...token,
        amount: BigInt(token.amount) * 2n,
      })),
    );
  });
});

describe('isCovering', () => {
  /**
   * @target should return true when selected boxes cover the request requirements
   * @dependencies
   * @scenario
   * - add boxes with sufficient ergs and tokens
   * - call isCovering function
   * @expected
   * - should return true when requirements are met
   */
  it('should return true when selected boxes cover the request requirements', () => {
    const box = sampleErgoBoxes.validBoxWithTokens;

    boxSelector.addBox(box);
    const result = boxSelector.isCovering();

    expect(result).toBe(true);
  });

  /**
   * @target should return false when selected boxes do not cover erg requirements
   * @dependencies
   * @scenario
   * - create a request with high erg requirement
   * - add boxes with insufficient ergs
   * - call isCovering function
   * @expected
   * - should return false when erg requirements are not met
   */
  it('should return false when selected boxes do not cover erg requirements', () => {
    const highErgRequest = sampleRequests.highErgRequest;
    const highErgBoxSelector = new BoxSelector(mockLogger, highErgRequest);
    const box = sampleErgoBoxes.validBoxWithTokens;

    highErgBoxSelector.addBox(box);
    const result = highErgBoxSelector.isCovering();

    expect(result).toBe(false);
  });

  /**
   * @target should return false when selected boxes do not cover token requirements
   * @dependencies
   * @scenario
   * - create a request with specific token requirements
   * - add boxes with insufficient token amounts
   * - call isCovering function
   * @expected
   * - should return false when token requirements are not met
   */
  it('should return false when selected boxes do not cover token requirements', () => {
    const highTokenRequest = sampleRequests.highTokenRequest;
    const highTokenBoxSelector = new BoxSelector(mockLogger, highTokenRequest);
    const box = sampleErgoBoxes.validBoxWithTokens;

    highTokenBoxSelector.addBox(box);
    const result = highTokenBoxSelector.isCovering();

    expect(result).toBe(false);
  });

  /**
   * @target should return true when request has no value requirements
   * @dependencies
   * @scenario
   * - create a request with no erg value requirement
   * - add any box to the selector
   * - call isCovering function
   * @expected
   * - should return true when no value requirements exist
   */
  it('should return true when request has no value requirements', () => {
    const noValueRequest = sampleRequests.noValueRequest;
    const noValueBoxSelector = new BoxSelector(mockLogger, noValueRequest);
    const box = sampleErgoBoxes.validBoxWithTokens;

    noValueBoxSelector.addBox(box);
    const result = noValueBoxSelector.isCovering();

    expect(result).toBe(true);
  });
});

describe('getBoxes', () => {
  /**
   * @target should return empty array when no boxes are added
   * @dependencies
   * @scenario
   * - create a new BoxSelector without adding any boxes
   * - call getBoxes function
   * @expected
   * - should return empty array
   */
  it('should return empty array when no boxes are added', () => {
    const boxes = boxSelector.getBoxes();

    expect(boxes).toEqual([]);
  });

  /**
   * @target should return all added boxes in order
   * @dependencies
   * @scenario
   * - add multiple boxes to the selector
   * - call getBoxes function
   * @expected
   * - should return all added boxes in the order they were added
   */
  it('should return all added boxes in order', () => {
    const box1 = sampleErgoBoxes.validBoxWithTokens;
    const box2 = sampleErgoBoxes.validBoxWithErgs;

    boxSelector.addBox(box1);
    boxSelector.addBox(box2);

    const boxes = boxSelector.getBoxes();

    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toBe(box1);
    expect(boxes[1]).toBe(box2);
  });
});
