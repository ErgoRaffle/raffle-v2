import {
  BitcoinRpcTransaction,
  BitcoinRpcTxOutput,
} from '@rosen-bridge/bitcoin-scanner';

/** Bitcoin-style test data for DynamicExtractor */
export const sampleBitcoinAddress =
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';

export const sampleInvalidBitcoinAddress = 'not-a-valid-btc-address';

/** P2WPKH scriptPubKey hex that decodes to sampleBitcoinAddressOther */
export const sampleScriptPubKeyHexOther =
  '0014751e76e8199196d454941c45d1b3a323f1433bd6';

/** P2WPKH scriptPubKey hex that decodes to sampleBitcoinAddress */
export const sampleScriptPubKeyHexAddress =
  '0014311564348890e005880a9bc834aaa5884f1b5932';

export const sampleBitcoinTxOutput: BitcoinRpcTxOutput = {
  value: 50000,
  n: 0,
  scriptPubKey: {
    asm: 'OP_0 751e76e8199196d454941c45d1b3a323f1433bd6',
    hex: sampleScriptPubKeyHexOther,
  },
};

/** Second vout decoding to sampleBitcoinAddress (so tx passes pre-filter when watching runes for that address) */
export const sampleBitcoinTxOutputAddress: BitcoinRpcTxOutput = {
  value: 10000,
  n: 1,
  scriptPubKey: {
    asm: 'OP_0 311564348890e005880a9bc834aaa5884f1b5932',
    hex: sampleScriptPubKeyHexAddress,
  },
};

/** Tx with both vouts: [0]=sampleBitcoinAddressOther, [1]=sampleBitcoinAddress */
export const sampleBitcoinTx: BitcoinRpcTransaction = {
  txid: 'a1b2c3d4e5f6789012345678901234567890abcdef',
  hash: 'a1b2c3d4e5f6789012345678901234567890abcdef',
  version: 2,
  size: 100,
  vsize: 100,
  weight: 400,
  locktime: 0,
  vin: [],
  vout: [sampleBitcoinTxOutput, sampleBitcoinTxOutputAddress],
  hex: '',
};

/** Tx with single vout decoding to sampleBitcoinAddressOther only (for pre-filter skip test) */
export const sampleBitcoinTxOnlyOther: BitcoinRpcTransaction = {
  txid: 'b2c3d4e5f6789012345678901234567890abcdef01',
  hash: 'b2c3d4e5f6789012345678901234567890abcdef01',
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

/** Expected box when processTransactions uses runes network returning one rune (rune on vout 1 = sampleBitcoinAddress) */
export const sampleDynamicExtractedDataWithRune = {
  identifier: `${sampleBitcoinTx.txid}:1`,
  txId: sampleBitcoinTx.txid,
  address: sampleBitcoinAddress,
  serialized: '',
  tokenId: sampleTokenId,
  amount: '100',
};

/** Expected BTC boxes produced from sampleBitcoinTx outputs. */
export const sampleDynamicExtractedBtcBox = {
  identifier: `${sampleBitcoinTx.txid}:1`,
  txId: sampleBitcoinTx.txid,
  address: sampleBitcoinAddress,
  serialized: '',
  tokenId: 'btc',
  amount: '10000',
};
