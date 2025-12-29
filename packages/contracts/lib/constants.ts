import { compile } from '@fleet-sdk/compiler';
import * as path from 'node:path';

export const TRUE_SCRIPT_HEX = compile('{sigmaProp(true);}').toHex().toString();
export const DEFAULT_FEE = 15_000_000n;
export const SCRIPT_DIR = path.join(import.meta.dirname, `../lib/scripts/`);
export const scriptList = [
  'service',
  'inactiveRaffle',
  'ticketRepo',
  'activeRaffle',
  'winner',
  'ticket',
  'successRaffle',
  'winnerPrize',
  'gift',
  'giftRedeem',
  'giftTokenRepo',
  'ticketRedeem',
  'raffleDetails',
  'safePay',
];

export const scriptsRequireAddresses: {
  [key: string]: { [key2: string]: string };
} = {
  service: {
    inactiveRaffle: 'INACTIVE_RAFFLE_SCRIPT_HASH_B64',
    ticketRepo: 'TICKET_REPO_SCRIPT_HASH_B64',
  },
  inactiveRaffle: {
    activeRaffle: 'ACTIVE_RAFFLE_SCRIPT_HASH_B64',
    raffleDetails: 'RAFFLE_DETAILS_SCRIPT_HASH_B64',
    winner: 'WINNER_SCRIPT_HASH_B64',
  },
  ticketRepo: {},
  activeRaffle: {
    successRaffle: 'SUCCESS_RAFFLE_SCRIPT_HASH_B64',
    giftRedeem: 'GIFT_REDEEM_SCRIPT_HASH_B64',
    ticket: 'TICKET_SCRIPT_HASH_B64',
    safePay: 'SAFE_PAY_SCRIPT_HASH_B64',
  },
  winner: {
    gift: 'GIFT_SCRIPT_HASH_B64',
    winnerPrize: 'WINNER_PRIZE_SCRIPT_HASH_B64',
    successRaffle: 'SUCCESS_RAFFLE_SCRIPT_HASH_B64',
    giftRedeem: 'GIFT_REDEEM_SCRIPT_HASH_B64',
  },
  ticket: {
    safePay: 'SAFE_PAY_SCRIPT_HASH_B64',
    ticketRedeem: 'TICKET_REDEEM_SCRIPT_HASH_B64',
  },
  successRaffle: {
    safePay: 'SAFE_PAY_SCRIPT_HASH_B64',
  },
  winnerPrize: {
    safePay: 'SAFE_PAY_SCRIPT_HASH_B64',
    ticket: 'TICKET_SCRIPT_HASH_B64',
  },
  giftRedeem: {
    ticketRedeem: 'TICKET_REDEEM_SCRIPT_HASH_B64',
  },
  gift: {
    safePay: 'SAFE_PAY_SCRIPT_HASH_B64',
    winnerPrize: 'WINNER_PRIZE_SCRIPT_HASH_B64',
  },
  giftTokenRepo: {},
  ticketRedeem: {
    safePay: 'SAFE_PAY_SCRIPT_HASH_B64',
  },
  raffleDetails: {
    activeRaffle: 'ACTIVE_RAFFLE_SCRIPT_HASH_B64',
  },
  safePay: {},
};

export const defaultScriptsVariables: {
  [key1: string]: { [key2: string]: string | number };
} = {
  defaults: {},
  service: {
    OWNER_NFT_B64: '',
  },
  ticketRepo: {
    RAFFLE_LICENSE_B64: '',
  },
  ticketRedeem: {
    SERVICE_NFT_B64: '',
  },
  inactiveRaffle: {
    GIFT_TOKEN_COUNT: '1000L',
  },
  activeRaffle: {
    ORACLE_TOKEN_ID_B64: '',
  },
  winner: {
    RAFFLE_LICENSE_B64: '',
  },
  successRaffle: {
    SERVICE_NFT_B64: '',
  },
  ticket: {
    RAFFLE_LICENSE_B64: '',
    TICKET_COLLECTOR_NFT_B64: '',
    TICKET_EXPIRATION_HEIGHT: 7200,
  },
};

export const defaultBuildVariables = {
  giftTokenCount: 1000,
  ticketExpirationHeight: 7200,
  tokens: {
    oracleTokenId:
      '0000000000000000000000000000000000000000000000000000000000000000',
    serviceNft:
      '0000000000000000000000000000000000000000000000000000000000000001',
    raffleLicense:
      '0000000000000000000000000000000000000000000000000000000000000002',
    ownerNft:
      '0000000000000000000000000000000000000000000000000000000000000003',
    ticketCollectorNft:
      '0000000000000000000000000000000000000000000000000000000000000004',
  },
};
