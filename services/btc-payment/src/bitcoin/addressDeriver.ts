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

  /**
   * Builds the BIP32 root from the bitcoin mnemonic and network type
   *
   * @param bitcoinConfig - Bitcoin mnemonic and network type
   */
  constructor(bitcoinConfig: ConfigTypes.Bitcoin) {
    const seed = bip39.mnemonicToSeedSync(bitcoinConfig.mnemonic);
    this.network =
      bitcoinConfig.network === 'mainnet'
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
    this.root = BIP32.fromSeed(seed, this.network);
    this.chainType = this.network === bitcoin.networks.bitcoin ? 0 : 1;
  }

  /**
   * Derives a Taproot (BIP86) receive address at `m/86'/coin'/0'/0/{index}`.
   *
   * @param index - Sequential donation index
   * @returns Bech32m Taproot address string
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
