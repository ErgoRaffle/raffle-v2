import { Asset, OutputBox } from '../../lib';
import { Request } from '../../lib/types';

/**
 * Builds a request fixture with injected callbacks.
 */
export const createRequest = (
  ergoTree: string,
  value: bigint | undefined,
  tokens: Asset[],
  onSuffice: () => Promise<void>,
  getConfirmedBoxes: () => Promise<OutputBox[]>,
): Request => ({
  ergoTree,
  value,
  tokens,
  onSuffice,
  getConfirmedBoxes,
});
