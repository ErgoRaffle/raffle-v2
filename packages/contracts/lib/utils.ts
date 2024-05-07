import * as fs from 'fs';
import * as path from 'node:path';

import { compile } from '@fleet-sdk/compiler';
import { SType } from '@fleet-sdk/serializer';

import * as constants from '../constants';
import { logger } from './logger';
import { ScriptNamesType, ContextVarsType } from './types';

/**
 * Returns all of compiled Raffle-v2 contracts
 *
 * @remarks
 * This method is part of the {@link raffle-v2#contracts | contracts subsystem}.
 *
 * @param contextVars - variables of raffle-v2 scripts
 * @param logger - logger object
 * @returns object that contains compiled contracts
 */
export function compileAll(
  contextVars?: ContextVarsType,
  outputsAsHex: boolean = false,
): { [key: string]: string } {
  const contracts: { [key: string]: string } = {};

  for (const scriptName of constants.scriptList) {
    const scriptVars =
      contextVars !== undefined
        ? contextVars.get(scriptName as ScriptNamesType) ||
          new Map<string, string>()
        : new Map<string, string>();
    let script: string = fs.readFileSync(
      path.join(constants.SCRIPT_DIR, `${scriptName}.es`),
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

/**
 * Convert bigint to Uint8Array
 * @param num
 * @returns Uint8Array object
 */
export function bigIntToUint8Array(num: bigint) {
  const b = new ArrayBuffer(8);
  new DataView(b).setBigUint64(0, num);
  return new Uint8Array(b);
}
