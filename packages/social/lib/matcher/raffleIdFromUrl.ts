/**
 * True if `host` matches an allow-list `pattern`.
 *
 * Patterns are either exact ("testnet-beta.ergoraffle.com") or a single leading wildcard
 * ("*.ergoraffle.com"), which matches any sub-domain of ergoraffle.com but NOT the apex itself.
 * The required leading dot is what prevents look-alikes such as "ergoraffle.com.evil.com"
 * (ends with ".evil.com", not ".ergoraffle.com") or "notergoraffle.com" (no dot boundary).
 *
 * @param host - lower-cased hostname from the URL under test
 * @param pattern - lower-cased allow-list entry (exact host or "*.domain")
 */
const hostMatches = (host: string, pattern: string): boolean => {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(1); // ".ergoraffle.com"
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return host === pattern;
};

/**
 * Resolve a raffle id from a URL found in a tweet.
 *
 * Returns the raffle id when `url` points at a raffle detail page (`/raffles/{id}`) on an
 * allow-listed host, otherwise `null`. Tolerant of a trailing slash, query string, hash fragment,
 * and an optional leading locale segment (e.g. `/en/raffles/{id}`).
 *
 * The `{id}` is the same canonical raffle id used by the frontend route and the API, so no extra
 * lookup is needed here beyond "is it a non-empty segment". Always pass a fully-expanded URL
 * (a tweet entity's `expanded_url`), never a `t.co` short link.
 *
 * @param url - a fully-expanded absolute URL
 * @param allowHosts - allow-list (config `SOCIAL_ALLOW_HOSTS`); exact or "*.domain" wildcard entries
 * @returns the raffle id, or null when the URL is not a raffle link on an allowed host
 */
export const raffleIdFromUrl = (
  url: string,
  allowHosts: readonly string[],
): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null; // not a valid absolute URL
  }

  // Only http(s); reject other schemes (javascript:, data:, ...).
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  if (!allowHosts.some((pattern) => hostMatches(host, pattern.toLowerCase()))) {
    return null;
  }

  // Path segments without empties, dropping an optional leading locale segment (e.g. "en", "en-us").
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length > 0 && /^[a-z]{2}(-[a-z]{2})?$/i.test(segments[0])) {
    segments.shift();
  }

  // Expect: raffles/{id}
  if (segments.length < 2 || segments[0] !== 'raffles') return null;
  const id = segments[1];
  return id.length > 0 ? id : null;
};

/**
 * Resolve the raffle id from the first URL in a list that points at a raffle (e.g. all of a
 * tweet's expanded URLs). Returns null when none resolve.
 *
 * @param urls - fully-expanded URLs found in the tweet
 * @param allowHosts - allow-list (see `raffleIdFromUrl`)
 */
export const firstRaffleId = (
  urls: readonly string[],
  allowHosts: readonly string[],
): string | null => {
  for (const url of urls) {
    const id = raffleIdFromUrl(url, allowHosts);
    if (id) return id;
  }
  return null;
};
