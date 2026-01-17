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
 * Convert bigint to Uint8Array
 * @param num - The bigint number to convert
 * @returns Uint8Array object
 */
export const bigIntToUint8Array = (num: bigint): Uint8Array => {
  const b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0, num);
  return new Uint8Array(b);
};
