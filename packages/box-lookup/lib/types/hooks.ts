export interface BoxLookupHooks {
  /**
   * Called once per `serveRequests` run, before any request is served and before
   * any `onSuffice` can be called.
   */
  before?: () => void | Promise<void>;

  /**
   * Called once per `serveRequests` run, after all requests have been processed.
   * Runs in a `finally` block.
   */
  after?: () => void | Promise<void>;
}
