import { TokenAmount, Amount, ErgoBox } from '@fleet-sdk/core';

export interface Request {
  address: string;
  tokens: TokenAmount<bigint | Amount>[];
  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice(boxes: ErgoBox[]): void;
}
