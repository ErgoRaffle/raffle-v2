export { SpendInfo } from '@rosen-bridge/abstract-extractor';

export interface ExtractedBox {
  boxId: string;
  txId: string;
  boxSerialized: string;
  extractor: string;
}

export interface RaffleServiceBoxInterface extends ExtractedBox {
  serviceFeePercent: number;
  implementerFeePercent: number;
  creationFee: bigint;
}
