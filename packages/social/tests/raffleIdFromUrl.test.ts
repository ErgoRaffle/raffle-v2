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

describe('raffleIdFromUrl with the apex host allow-listed', () => {
  // Adding the exact apex entry alongside the wildcard makes "ergoraffle.com plus all of its
  // sub-domains" resolvable, while the dot-boundary still rejects look-alikes.
  const HOSTS_WITH_APEX = [
    'ergoraffle.com',
    'testnet-beta.ergoraffle.com',
    '*.ergoraffle.com',
    'raffle.rosen.tech',
  ];

  it('resolves the bare apex once it is allow-listed', () => {
    expect(
      raffleIdFromUrl('https://ergoraffle.com/raffles/a', HOSTS_WITH_APEX),
    ).toBe('a');
  });

  it('still resolves sub-domains (http included)', () => {
    expect(
      raffleIdFromUrl('http://www.ergoraffle.com/raffles/b', HOSTS_WITH_APEX),
    ).toBe('b');
    expect(
      raffleIdFromUrl(
        'https://testnet-beta.ergoraffle.com/raffles/c',
        HOSTS_WITH_APEX,
      ),
    ).toBe('c');
  });

  it('still rejects look-alike hosts', () => {
    expect(
      raffleIdFromUrl(
        'https://ergoraffle.com.evil.com/raffles/a',
        HOSTS_WITH_APEX,
      ),
    ).toBeNull();
    expect(
      raffleIdFromUrl('https://notergoraffle.com/raffles/a', HOSTS_WITH_APEX),
    ).toBeNull();
  });
});
