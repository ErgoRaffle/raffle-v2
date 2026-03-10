import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

import * as ConfigTypes from '../types/configs';

bitcoin.initEccLib(ecc);

const BIP32 = bip32.BIP32Factory(ecc);

export class AddressDeriver {
  private root: bip32.BIP32Interface;
  private chainType: number;
  private network: bitcoin.Network;

  constructor(private readonly bitcoinConfig: ConfigTypes.Bitcoin) {
    const seed = bip39.mnemonicToSeedSync(bitcoinConfig.mnemonic);
    this.network =
      bitcoinConfig.network === 'mainnet'
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    this.root = BIP32.fromSeed(seed, this.network);
    this.chainType = this.network === bitcoin.networks.bitcoin ? 0 : 1;
  }

  /**
   * Derive a Taproot Bitcoin address from the config mnemonic and index
   * @param index - The index of the address to derive
   * @returns
   */
  public deriveAddress = (index: number): string => {
    const child = this.root.derivePath(
      `m/86'/${this.chainType}'/0'/0/${index}`,
    );

    // Convert to x-only pubkey for Taproot
    const xOnlyPubkey =
      child.publicKey.length === 32
        ? child.publicKey
        : child.publicKey.subarray(1, 33);

    const { address } = bitcoin.payments.p2tr({
      internalPubkey: Buffer.from(xOnlyPubkey),
      network: this.network,
    });

    if (!address) {
      throw new Error('Failed to derive address');
    }

    return address;
  };
}
