import { TokenAmount, Amount, ErgoBox } from '@fleet-sdk/core';

export interface Request {
  address: string;
  value: number | undefined;
  tokens: TokenAmount<Amount>[];
  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice: (boxes: ErgoBox[]) => Promise<void>;
}
