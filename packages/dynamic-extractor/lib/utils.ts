import * as bitcoin from 'bitcoinjs-lib';

/**
 * Derive Bitcoin address from RPC scriptPubKey hex.
 * @param scriptPubKeyHex - scriptPubKey.hex from BitcoinRpcTxOutput
 * @param network - Optional network (default mainnet)
 * @returns Address string or null if script cannot be decoded to a standard address
 */
export function getAddressFromScriptPubKey(
  scriptPubKeyHex: string,
  network: bitcoin.Network,
): string | null {
  try {
    const script = Buffer.from(scriptPubKeyHex, 'hex');
    return bitcoin.address.fromOutputScript(script, network);
  } catch {
    return null;
  }
}
