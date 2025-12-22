import { ErgoBox, TokenAmount } from '@fleet-sdk/core';

/**
 * The background-job onSuffice callback signature (fleet `ErgoBox` based).
 *
 * @param boxes - Selected boxes satisfying the request
 * @param unspentBoxes - Current view of all available unspent boxes
 * @param requestId - The request id assigned by box-lookup
 */
export type OnSufficeCallback = (
  boxes: ErgoBox[],
  unspentBoxes: ErgoBox[],
  requestId: number,
) => Promise<void>;

/**
 * A function that returns confirmed (mined) unspent boxes (fleet `ErgoBox` based).
 */
export type GetConfirmedBoxes = () => Promise<ErgoBox[]>;

/**
 * Background-job request type used by transaction services.
 */
export interface Request {
  address: string;
  value: bigint | undefined;
  tokens: TokenAmount<bigint>[];
  onSuffice: OnSufficeCallback;
  getConfirmedBoxes: GetConfirmedBoxes;
}
