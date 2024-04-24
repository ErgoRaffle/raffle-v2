import * as fs from 'fs';
import * as path from 'node:path';
import { compile } from '@fleet-sdk/compiler';

import { logger } from './logger';

import { ScriptNamesType, ContextVarsType } from './types';

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

export function compileAll(contextVars?: ContextVarsType): {
  [key: string]: string;
} {
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

    try {
      const contract = compile(script, {});
      contracts[scriptName] = contract.toAddress().toString();
    } catch (err) {
      logger.error(`The compileAll function raised error: ${err}`);
      throw err;
    }
  }
  logger.info(`The compileAll function done successful`);

  return contracts;
}
