import { TokenAmount, Amount } from '@fleet-sdk/core';
import { ErgoTransactionOutput } from '@rosen-clients/ergo-node';

export interface Request {
  address: string;
  nanoErgValue: number | undefined;
  tokens: TokenAmount<Amount>[];
  /**
   * This method is called by BoxLookup when the preferred condition occurs
   * @param boxes
   */
  onSuffice: (boxes: ErgoTransactionOutput[]) => Promise<void>;
}
