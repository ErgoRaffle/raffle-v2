import { ErgoAddress } from '@fleet-sdk/core';
import { blake2b256 } from '@fleet-sdk/crypto';

/**
 * Serialize string to base64
 * @param str - String to serialize
 * @returns Base64 encoded string
 */
export const stringToBase64 = (str: string): string => {
  return Buffer.from(str, 'utf-8').toString('base64');
};

/**
 * Serialize hex string to base64
 * @param str - Hex string to serialize
 * @returns Base64 encoded string
 */
export const hexToBase64 = (str: string): string => {
  return Buffer.from(str, 'hex').toString('base64');
};

/**
 * Hash the hex encoded string and serialize to base64
 * @param str - Hex encoded string to hash and serialize to base64
 * @returns Base64 encoded string
 */
export const hashAndSerializeToBase64 = (str: string): string => {
  const ergoTree = ErgoAddress.fromBase58(str).ergoTree;
  return Buffer.from(blake2b256(Buffer.from(ergoTree, 'hex'))).toString(
    'base64',
  );
};

/**
 * Convert bigint to Uint8Array
 * @param num - The bigint number to convert
 * @returns Uint8Array object
 */
export const bigIntToUint8Array = (num: bigint): Uint8Array => {
  const b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0, num);
  return new Uint8Array(b);
};
