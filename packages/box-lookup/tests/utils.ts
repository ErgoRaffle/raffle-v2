import { BoxLookup } from '../lib/boxLookup';
import { AbstractLookupRequest } from '../lib/abstractRequest';

/**
 * get a BoxLookup object and extract private request
 * @param boxLookup
 * @returns {Map<number, AbstractLookupRequest | undefined>}
 */
export const getBoxLookupRequest = (boxLookup: BoxLookup) => {
  interface PublicRequestProperty {
    requests: Map<number, AbstractLookupRequest | undefined>;
  }

  return (boxLookup as unknown as PublicRequestProperty).requests;
};
