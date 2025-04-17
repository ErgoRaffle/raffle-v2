import { TokenAmount, Amount, ErgoBox } from '@fleet-sdk/core';

export interface Request {
  address: string;
  tokens: TokenAmount<bigint | Amount>[];
  onSuffice(box: ErgoBox): void;
}
