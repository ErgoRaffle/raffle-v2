import * as path from 'node:path';

import { compile } from '@fleet-sdk/compiler';

let __dirname;

if (__dirname === undefined) {
  __dirname = path.dirname(import.meta.url).replace('file:', '');
}

export const TRUE_SCRIPT_HEX = compile('{sigmaProp(true);}').toHex().toString();
export const DEFAULT_FEE = 15_000_000n;
export const SCRIPT_DIR = path.join(__dirname, `lib/scripts/`);
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
  },
  winner: {
    gift: 'GIFT_SCRIPT_HASH_B64',
    winnerPrize: 'WINNER_PRIZE_SCRIPT_HASH_B64',
    successRaffle: 'SUCCESS_RAFFLE_SCRIPT_HASH_B64',
    giftRedeem: 'GIFT_REDEEM_SCRIPT_HASH_B64',
  },
  ticket: {},
  successRaffle: {},
  winnerPrize: {},
  gift: {},
  giftRedeem: {},
  giftTokenRepo: {},
  ticketRedeem: {},
  raffleDetails: {
    activeRaffle: 'ACTIVE_RAFFLE_SCRIPT_HASH_B64',
  },
};

export const defaultScriptsVariables: {
  [key1: string]: { [key2: string]: string | bigint | number | undefined };
} = {
  defaults: {},
  service: {
    OWNER_NFT_B64: '',
  },
  inactiveRaffle: {
    GIFT_TOKEN_COUNT: 1000,
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
};

export const defaultBuildVariables = {
  defaults: {},
  service: {
    OWNER_NFT_B64: '',
  },
  inactiveRaffle: {
    GIFT_TOKEN_COUNT: 1000,
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
  tokens: {
    ServiceNft: '',
    RaffleLicense: '',
    CollectingToken: null,
  },
};
