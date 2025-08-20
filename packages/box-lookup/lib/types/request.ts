import { TokenAmount, ErgoBox } from '@fleet-sdk/core';

export interface Request {
  address: string;
  value: bigint | undefined;
  tokens: TokenAmount<bigint>[];
  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice: OnSufficeCallback;
  getConfirmedBoxes: GetConfirmedBoxes;
}

export type OnSufficeCallback = (
  boxes: ErgoBox[],
  unspentBoxes: ErgoBox[],
  requestId: number,
) => Promise<void>;

export type GetConfirmedBoxes = () => Promise<ErgoBox[]>;
