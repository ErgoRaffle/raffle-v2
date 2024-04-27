import * as fs from 'fs';
import * as path from 'node:path';

import { compile } from '@fleet-sdk/compiler';
import { SType } from '@fleet-sdk/serializer';
import { SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';

import { logger } from './logger.js';

const __dirname = path.resolve(path.dirname(''));

const scriptList = [
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

export const defaultScriptsVariables = {
  service: {
    OWNER_NFT_B64: '',
    INACTIVE_RAFFLE_SCRIPT_HASH_B64: '',
    TICKET_REPO_SCRIPT_HASH_B64: '',
    FEE: 15000000n,
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

export type ScriptNamesType =
  | 'service'
  | 'inactiveRaffle'
  | 'ticketRepo'
  | 'activeRaffle'
  | 'winner'
  | 'ticket'
  | 'successRaffle'
  | 'winnerPrize'
  | 'gift'
  | 'giftRedeem'
  | 'ticketRedeem';
export type ContextVarsType = Map<
  ScriptNamesType,
  Map<string, string | Map<string, string>>
>;

export function compileAll(
  contextVars?: ContextVarsType,
  outputsAsHex: boolean = false,
): { [key: string]: string } {
  const contracts: { [key: string]: string } = {};

  for (const scriptName of scriptList) {
    const scriptVars =
      contextVars !== undefined
        ? contextVars.get(scriptName as ScriptNamesType) ||
          new Map<string, string>()
        : new Map<string, string>();
    let script: string = fs.readFileSync(
      path.join(__dirname, `lib/scripts/${scriptName}.es`),
      'utf8',
    );

    for (const nameAndValue of Object.entries(scriptVars))
      script = script.replace(nameAndValue[0], nameAndValue[1]);

    const vars: { [key: string | number]: string | SType } = {};
    try {
      const contract = compile(script, { map: vars });
      if (outputsAsHex) {
        contracts[scriptName] = contract.toHex().toString();
      } else {
        contracts[scriptName] = contract.toAddress().toString();
      }
    } catch (err) {
      logger.error(`The compileAll function raised error: ${err}`);
      throw err;
    }
  }
  logger.info(`The compileAll function done successful`);

  return contracts;
}

export function bigIntToUint8Array(num: bigint) {
  const b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0, num);
  return new Uint8Array(b);
}
