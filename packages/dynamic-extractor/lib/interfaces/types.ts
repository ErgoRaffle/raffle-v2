import { AbstractEntityData } from '@rosen-bridge/abstract-extractor';

export interface DynamicBoxInterface extends AbstractEntityData {
  txId: string;
  address: string;
  /** Token id: rune id from runes network, or 'btc' for native UTXO value */
  tokenId: string;
  /** Token amount as string (sats for btc, rune amount for runes) */
  amount: string;
}
