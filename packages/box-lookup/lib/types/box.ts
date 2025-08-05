import { TokenAmount } from '@fleet-sdk/core';

export interface BoxValue {
  value: bigint;
  tokens: TokenAmount<bigint>[];
}
