import { BitcoinEsploraTransaction } from '@rosen-bridge/bitcoin-scanner';

/** Bitcoin-style test data for DynamicExtractor */
export const sampleBitcoinAddress =
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
/** Another valid Bitcoin address (BIP173 test vector) for "other address" tests */
export const sampleBitcoinAddressOther =
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';
export const sampleInvalidBitcoinAddress = 'not-a-valid-btc-address';

export const sampleBitcoinTxOutput = {
  scriptpubkey: '0014751e76e8199196d454941c45d1b3a323f1433bd6',
  scriptpubkey_asm:
    'OP_0 OP_PUSHBYTES_20 751e76e8199196d454941c45d1b3a323f1433bd6',
  scriptpubkey_type: 'v0_p2wpkh',
  scriptpubkey_address: sampleBitcoinAddress,
  value: 50000,
};

export const sampleBitcoinTx: BitcoinEsploraTransaction = {
  txid: 'a1b2c3d4e5f6789012345678901234567890abcdef',
  version: 2,
  locktime: 0,
  vin: [],
  vout: [sampleBitcoinTxOutput],
  size: 100,
  weight: 400,
  fee: 1000,
  status: {
    confirmed: true,
    block_height: 800000,
    block_hash: '0000000000000000000123456789abcdef',
    block_time: 1234567890,
  },
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
