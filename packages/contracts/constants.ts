import * as path from 'node:path';

import { SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';

import * as constants from './constants';

const __dirname = path.resolve('');

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
    FEE: constants.DEFAULT_FEE,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  },
  inactiveRaffle: {
    GIFT_TOKEN_COUNT: 1000,
    FEE: constants.DEFAULT_FEE,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  },
  ticketRepo: {},
  activeRaffle: {
    ORACLE_TOKEN_ID_B64: '',
  },
  winner: {
    RAFFLE_LICENSE_B64: '',
  },
  ticket: {},
  successRaffle: {
    SERVICE_NFT_B64: '',
  },
  winnerPrize: {},
  gift: {},
  giftRedeem: {},
  giftTokenRepo: {},
  ticketRedeem: {},
  raffleDetails: {
    RAFFLE_LICENSE_B64: '',
  },
};
