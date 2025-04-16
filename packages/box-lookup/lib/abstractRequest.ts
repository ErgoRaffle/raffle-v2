import { TokenAmount, Amount, ErgoBox } from '@fleet-sdk/core';

export abstract class AbstractLookupRequest {
  constructor(
    public readonly address: string,
    public readonly tokens: TokenAmount<bigint | Amount>[],
  ) {}

  /**
   * this method call when BoxLookUp object detect desired situation of the request
   */
  abstract readonly onSuffice: (box: ErgoBox) => Promise<boolean>;
}
