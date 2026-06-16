/**
 * Build the X search query both providers use to discover candidate posts.
 *
 * Discovery is two-pronged: a post is a candidate if it **mentions @handle** OR if it **links one
 * of the raffle domains** (the `url:` operator matches the domain token in a tweet's links,
 * including sub-domains — e.g. `url:ergoraffle.com` also matches `testnet-beta.ergoraffle.com`).
 * The URL prong is what lets link-only posts (no mention) be found; the strict allow-list match in
 * `raffleIdFromUrl` still decides what is actually kept.
 *
 * Examples:
 *   buildDiscoveryQuery('ergoraffle', ['ergoraffle.com'])
 *     => "(@ergoraffle OR url:ergoraffle.com)"
 *   buildDiscoveryQuery('ergoraffle', [])
 *     => "@ergoraffle"
 *
 * Standard X search syntax, supported by both the official recent-search API and twitterapi.io's
 * advanced search. Provider-specific extras (incremental `since_id`, pagination) are added by each
 * provider around this base.
 *
 * @param handle - the account handle without '@' (mention prong)
 * @param searchDomains - raffle domains to match in tweet URLs (URL prong); may be empty
 * @returns the base discovery query string
 */
export const buildDiscoveryQuery = (
  handle: string,
  searchDomains: readonly string[],
): string => {
  const clauses = [
    `@${handle}`,
    ...searchDomains.map((domain) => `url:${domain}`),
  ];
  // A single clause needs no grouping; multiple are OR-ed inside parentheses so a provider can
  // safely AND further operators (e.g. `since_id:`) onto the whole group.
  return clauses.length === 1 ? clauses[0] : `(${clauses.join(' OR ')})`;
};
