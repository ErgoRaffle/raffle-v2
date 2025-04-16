import { AbstractLookupRequest } from './abstractRequest';
import { TxPot } from '@rosen-bridge/tx-pot';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected requests = new Map<number, AbstractLookupRequest | undefined>();
  constructor(protected txPot: TxPot) {}

  /**
   * register a new lookup request and return its assigned ID
   * @param request
   * @returns {number}
   */
  readonly registerRequest = (request: AbstractLookupRequest) => {
    this.requests.set(++this.requestsIdCounter, request);
    return this.requestsIdCounter;
  };

  /**
   * unregister request by related request-id if exists
   * @param requestId
   * @returns {Request | undefined}
   */
  readonly unregisterRequest = (requestId: number) => {
    if (
      requestId > 0 &&
      requestId <= this.requestsIdCounter &&
      this.requests.get(requestId)
    ) {
      const request = this.requests.get(requestId);
      this.requests.delete(requestId);
      return request;
    }
    return undefined;
  };
}
