export interface ExtractedBox {
  boxId: string;
  txId: string;
  boxSerialized: string;
  extractorName: string;
}

export interface RaffleServiceBoxInterface extends ExtractedBox {
  serviceFeePercent: number;
  implementerFeePercent: number;
  creationFee: string;
}
