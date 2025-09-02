import { TokenAmount } from '@fleet-sdk/core';

export type BoxValue = {
  value: bigint;
  tokens: TokenAmount<bigint>[];
};
