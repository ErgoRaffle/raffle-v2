import { TokenAmount, ErgoBox } from '@fleet-sdk/core';

export interface Request {
  address: string;
  value: bigint | undefined;
  tokens: TokenAmount<bigint>[];
  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice: (boxes: ErgoBox[]) => Promise<void>;
}
