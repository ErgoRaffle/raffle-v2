import {
  BitcoinRpcTransaction,
  BitcoinRpcTxOutput,
} from '@rosen-bridge/bitcoin-scanner';

/** Bitcoin-style test data for DynamicExtractor */
export const sampleBitcoinAddress =
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
/** Another valid Bitcoin address (BIP173 test vector) for "other address" tests */
export const sampleBitcoinAddressOther =
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
export const sampleInvalidBitcoinAddress = 'not-a-valid-btc-address';

/** P2WPKH scriptPubKey hex that decodes to sampleBitcoinAddress */
export const sampleScriptPubKeyHex =
  '0014751e76e8199196d454941c45d1b3a323f1433bd6';

export const sampleBitcoinTxOutput: BitcoinRpcTxOutput = {
  value: 50000,
  n: 0,
  scriptPubKey: {
    asm: 'OP_0 751e76e8199196d454941c45d1b3a323f1433bd6',
    hex: sampleScriptPubKeyHex,
  },
};

export const sampleBitcoinTx: BitcoinRpcTransaction = {
  txid: 'a1b2c3d4e5f6789012345678901234567890abcdef',
  hash: 'a1b2c3d4e5f6789012345678901234567890abcdef',
  version: 2,
  size: 100,
  vsize: 100,
  weight: 400,
  locktime: 0,
  vin: [],
  vout: [sampleBitcoinTxOutput],
  hex: '',
};

export const sampleTokenId = 'rune-id-sample';

export const sampleDynamicExtractedData = {
  identifier: `${sampleBitcoinTx.txid}:0`,
  txId: sampleBitcoinTx.txid,
  address: sampleBitcoinAddress,
  serialized: '',
  tokenId: sampleTokenId,
  amount: '0',
};

/** Expected box when processTransactions uses runes network returning one rune */
export const sampleDynamicExtractedDataWithRune = {
  identifier: `${sampleBitcoinTx.txid}:0`,
  txId: sampleBitcoinTx.txid,
  address: sampleBitcoinAddress,
  serialized: '',
  tokenId: sampleTokenId,
  amount: '100',
};
