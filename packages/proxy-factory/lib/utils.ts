/**
 * Serialize string to base64
 * @param str - String to serialize
 * @returns Base64 encoded string
 */
export const stringToBase64 = (str: string): string => {
  return Buffer.from(str, 'utf-8').toString('base64');
};
