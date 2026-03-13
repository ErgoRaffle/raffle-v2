/**
 * Rune/token output info for a Bitcoin transaction, as returned by the runes protocol network.
 */
export interface TxOutputRune {
  /** Receiving address for this rune output */
  address: string;
  /** Rune/token id (e.g. rune id on Bitcoin) */
  runeId: string;
  /** Amount as string (for large integers) */
  runeAmount: string;
  /** Index of the tx output (vout) this rune belongs to */
  voutIndex: number;
}

export interface UnisatResponse<T> {
  data: T;
}

export interface UnisatRuneTransfer {
  txid: string;
  type: string;
  address: string;
  runeId: string;
  amount: string;
  vout: number;
}

export interface UnisatTxRunes {
  detail: UnisatRuneTransfer[];
  total: number;
  height: number;
}
