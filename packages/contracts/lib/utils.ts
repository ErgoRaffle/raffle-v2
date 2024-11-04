import { compile } from '@fleet-sdk/compiler';
import { blake2b256 } from '@fleet-sdk/crypto';
import { SConstant } from '@fleet-sdk/serializer';
import { Value } from 'sigmastate-js/main';
import * as fs from 'fs';
import * as path from 'node:path';

import * as constants from '../constants';
import { logger } from './logger';
import { ContextVarsType, ScriptNamesType } from './types';

const NotSet = '';

type NamedConstantsMap = {
  [key: string]: string | Value | SConstant;
};

/**
 * Merge compiling context vars by shared keys default values
 * and add required script hash keys
 * @param contextVars
 * @returns JSON Object
 */
function mergeContextVarsAndRequiredAddress(contextVars?: ContextVarsType) {
  const finalVars: { [s: string]: { [key: string]: string } } = {};
  const defaults = (contextVars?.get('defaults') || {}) as {
    [k: string]: string | bigint | null;
  };
  for (const scriptName of constants.scriptList) {
    finalVars[scriptName] = {};
    const scriptVars =
      contextVars !== undefined
        ? contextVars.get(scriptName as ScriptNamesType) || {}
        : {};

    // Update values by defaults JSON
    for (const defaultKey of Object.keys(contextVars?.get('defaults') || {}))
      if (Object.keys(scriptVars).indexOf(defaultKey) < 0)
        finalVars[scriptName][defaultKey] = (
          defaults[defaultKey] || ''
        ).toString();
    // Update values by script-name specific config JSON
    for (const nameAndValue of Object.entries(scriptVars))
      finalVars[scriptName][nameAndValue[0]] = (
        nameAndValue[1] || ''
      ).toString();
    // Add only script hash keys by NotSet values
    for (const key of Object.keys(
      constants.scriptsRequireAddresses[scriptName],
    )) {
      finalVars[scriptName][
        constants.scriptsRequireAddresses[scriptName][key]
      ] = NotSet;
    }
  }

  return finalVars;
}

/**
 * Returns all of compiled Raffle-v2 contracts
 *
 * @remarks
 * This method is part of the {@link raffle-v2#contracts | contracts subsystem}.
 *
 * @param contextVars - variables of raffle-v2 scripts
 * @param outputsAsHex
 * @param trueScripts
 * @returns object that contains compiled contracts
 */
export function compileAll(
  contextVars?: ContextVarsType,
  outputsAsHex: boolean = false,
  trueScripts: ScriptNamesType[] = [],
): { [key: string]: string } {
  const contracts: { [key: string]: string } = {};
  const compiledScripts = [];
  const compiledDependenciesStatus =
    mergeContextVarsAndRequiredAddress(contextVars);
  let notCompiledAnyScript = false;
  while (
    !notCompiledAnyScript &&
    compiledScripts.length < constants.scriptList.length
  ) {
    notCompiledAnyScript = true;
    let trueScriptsIndex = 1;
    for (const scriptName of constants.scriptList as ScriptNamesType[]) {
      // Check that precompiled required script already compiled or not
      let readyToCompile = true;
      const precompileScript =
        constants.scriptsRequireAddresses[scriptName] || {};
      for (const key of Object.keys(precompileScript)) {
        if (
          compiledDependenciesStatus[scriptName][precompileScript[key]] ===
          NotSet
        ) {
          readyToCompile = false;
          break;
        }
      }

      if (!readyToCompile || compiledScripts.indexOf(scriptName) >= 0) continue;
      notCompiledAnyScript = false;
      logger.info(`the ${scriptName} script ready to compile`);

      const scriptVars =
        compiledDependenciesStatus !== undefined
          ? compiledDependenciesStatus[scriptName as ScriptNamesType] ||
            new Map<string, string>()
          : new Map<string, string>();
      let script: string;
      if (trueScripts.indexOf(scriptName) >= 0) {
        script = `{ sigmaProp(HEIGHT > ${-trueScriptsIndex}) }`;
        trueScriptsIndex += 1;
      } else {
        script = fs.readFileSync(
          path.join(constants.SCRIPT_DIR, `${scriptName}.es`),
          'utf8',
        );
      }

      for (const nameAndValue of Object.entries(scriptVars))
        script = script.replace(nameAndValue[0], nameAndValue[1]);

      const vars: NamedConstantsMap = {};
      let contract;
      try {
        contract = compile(script, { map: vars });
        if (outputsAsHex) {
          contracts[scriptName] = contract.toHex().toString();
        } else {
          contracts[scriptName] = contract.toAddress().toString();
        }
      } catch (err) {
        logger.error(`The compileAll function raised error: ${err}`);
        throw err;
      }

      compiledScripts.push(scriptName);
      logger.info(`the ${scriptName} script compiled`);
      for (const script_ of constants.scriptList) {
        const updateScriptKey =
          constants.scriptsRequireAddresses[script_][scriptName];
        if (updateScriptKey !== undefined) {
          compiledDependenciesStatus[script_][updateScriptKey] = Buffer.from(
            blake2b256(contract?.toHex()),
          ).toString('base64');
        }
      }
    }
  }
  if (notCompiledAnyScript) {
    logger.error('Error: The compileAll function infinity loop');
    // Below situation occurring when defining
    // recursive dependencies between multiple scripts
    throw 'Error: The compileAll function infinity loop';
  } else {
    logger.info(`The compileAll function done successfully`);
  }

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
