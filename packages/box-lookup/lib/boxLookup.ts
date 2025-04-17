import { Request } from './types/request';
import { TxPot } from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected requests = new Map<number, Request | undefined>();
  constructor(
    protected txPot: TxPot,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {}

  /**
   * register a new lookup request and return its assigned ID
   * @param request
   * @returns {number}
   */
  readonly registerRequest = (request: Request) => {
    this.requests.set(++this.requestsIdCounter, request);
    this.logger?.info(
      `New BoxLookupRequest registered by ${this.requestsIdCounter} id`,
    );
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
      this.logger?.info(`A BoxLookupRequest unregistered by ${requestId} id`);
      this.requests.delete(requestId);
      return request;
    }
    this.logger?.info(
      `Tried to unregistered a BoxLookupRequest by ${requestId} id that not exists`,
    );
    return undefined;
  };
}
