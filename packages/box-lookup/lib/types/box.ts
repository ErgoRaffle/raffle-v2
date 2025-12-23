/**
 * A minimal box model compatible with `@rosen-bridge/scanner-interfaces` `OutputBox`.
 * `box-lookup` intentionally operates on this plain shape to remain independent of
 * any SDK-specific box classes (e.g., fleet-sdk).
 */

export type Asset = {
  tokenId: string;
  amount: bigint | string;
};

export type AdditionalRegisters = {
  R4?: string;
  R5?: string;
  R6?: string;
  R7?: string;
  R8?: string;
  R9?: string;
};

export type OutputBox = {
  boxId: string;
  value: bigint | string;
  ergoTree: string;
  creationHeight: number;
  assets: Array<Asset>;
  additionalRegisters: AdditionalRegisters;
  transactionId: string;
  index: number;
};

export interface BoxValue {
  value: bigint | string;
  tokens: Asset[];
}
