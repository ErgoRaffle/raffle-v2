import { TokenAmount, Amount, ErgoBox } from '@fleet-sdk/core';

export interface Request {
  address: string;
  value: number | undefined;
  tokens: TokenAmount<Amount>[];
  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice: (
    sufficeUnspentBoxes: ErgoBox[],
    totalUnspentBoxes: ErgoBox[],
  ) => Promise<void>;

  /**
   * This method return related mined boxes
   * @param dataProvider
   */
  getMinedUnspentBoxes: () => Promise<ErgoBox[]>;
}
