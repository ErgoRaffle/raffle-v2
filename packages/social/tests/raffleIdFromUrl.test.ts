import { describe, expect, it } from 'vitest';

import { firstRaffleId, raffleIdFromUrl } from '../lib/matcher/raffleIdFromUrl';

const HOSTS = [
  'testnet-beta.ergoraffle.com',
  '*.ergoraffle.com',
  'raffle.rosen.tech',
];

describe('raffleIdFromUrl', () => {
  it('resolves the id from an exact-host raffle URL', () => {
    expect(
      raffleIdFromUrl(
        'https://testnet-beta.ergoraffle.com/raffles/abc123',
        HOSTS,
      ),
    ).toBe('abc123');
  });

  it('resolves the id on a wildcard sub-domain', () => {
    expect(
      raffleIdFromUrl('https://www.ergoraffle.com/raffles/xyz', HOSTS),
    ).toBe('xyz');
  });

  it('resolves on the rosen host', () => {
    expect(raffleIdFromUrl('https://raffle.rosen.tech/raffles/r1', HOSTS)).toBe(
      'r1',
    );
  });

  it('tolerates trailing slash, query string and hash', () => {
    expect(
      raffleIdFromUrl(
        'https://raffle.rosen.tech/raffles/r1/?utm=x#section',
        HOSTS,
      ),
    ).toBe('r1');
  });

  it('tolerates a leading locale segment', () => {
    expect(
      raffleIdFromUrl('https://www.ergoraffle.com/en/raffles/loc1', HOSTS),
    ).toBe('loc1');
  });

  it('does NOT match the bare apex (wildcard is sub-domains only)', () => {
    expect(
      raffleIdFromUrl('https://ergoraffle.com/raffles/a', HOSTS),
    ).toBeNull();
  });

  it('rejects look-alike hosts', () => {
    expect(
      raffleIdFromUrl('https://ergoraffle.com.evil.com/raffles/a', HOSTS),
    ).toBeNull();
    expect(
      raffleIdFromUrl('https://notergoraffle.com/raffles/a', HOSTS),
    ).toBeNull();
  });

  it('rejects non-raffle paths and missing ids', () => {
    expect(
      raffleIdFromUrl('https://www.ergoraffle.com/about', HOSTS),
    ).toBeNull();
    expect(
      raffleIdFromUrl('https://www.ergoraffle.com/raffles/', HOSTS),
    ).toBeNull();
    expect(
      raffleIdFromUrl('https://www.ergoraffle.com/raffles', HOSTS),
    ).toBeNull();
  });

  it('rejects non-http(s) and invalid URLs', () => {
    expect(
      raffleIdFromUrl('javascript:alert(1)//ergoraffle.com/raffles/a', HOSTS),
    ).toBeNull();
    expect(raffleIdFromUrl('not a url', HOSTS)).toBeNull();
  });

  it('firstRaffleId returns the first resolvable url', () => {
    const urls = [
      'https://example.com/foo',
      'https://app.ergoraffle.com/raffles/win',
      'https://raffle.rosen.tech/raffles/other',
    ];
    expect(firstRaffleId(urls, HOSTS)).toBe('win');
    expect(firstRaffleId(['https://example.com/foo'], HOSTS)).toBeNull();
  });
});
