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
  'ticketRedeem',
];

export const scriptsRequireAddresses: {
  [key: string]: { [key2: string]: string };
} = {
  service: {
    inactiveRaffle: 'INACTIVE_RAFFLE_SCRIPT_HASH_B64',
    ticketRepo: 'TICKET_REPO_SCRIPT_HASH_B64',
  },
  inactiveRaffle: {},
  ticketRepo: {},
  activeRaffle: {},
  winner: {},
  ticket: {},
  successRaffle: {},
  winnerPrize: {},
  gift: {},
  giftRedeem: {},
  ticketRedeem: {},
};

export const defaultScriptsVariables = {
  service: {
    OWNER_NFT_B64: '',
    // INACTIVE_RAFFLE_SCRIPT_HASH_B64: '',
    // TICKET_REPO_SCRIPT_HASH_B64: '',
    FEE: constants.DEFAULT_FEE,
    MIN_BOX_VALUE: SAFE_MIN_BOX_VALUE,
  },
  inactiveRaffle: {},
  ticketRepo: {},
  activeRaffle: {},
  winner: {},
  ticket: {},
  successRaffle: {},
  winnerPrize: {},
  gift: {},
  giftRedeem: {},
  ticketRedeem: {},
};
