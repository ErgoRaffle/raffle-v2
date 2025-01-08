export interface ExtractedBox {
  boxId: string;
  txId: string;
  boxSerialized: string;
  extractor: string;
}

export interface RaffleServiceBoxInterface extends ExtractedBox {
  serviceFeePercent: number;
  implementerFeePercent: number;
  creationFee: string;
}

export interface SpendInfo {
  boxId: string;
  txId: string;
  index?: number;
}
