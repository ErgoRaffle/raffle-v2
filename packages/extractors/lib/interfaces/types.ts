export interface ExtractedBox {
  boxId: string;
  // block: string
  // height: number
  txId: string;
  // spendBlock: string | null
  // spendHeight: number
  boxSerialized: string;
  extractorName: string;
}

export interface RaffleServiceBoxInterface extends ExtractedBox {
  serviceFeePercent: string;
  implementerFeePercent: string;
  creationFee: string;
}
