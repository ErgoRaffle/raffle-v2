import * as fs from 'fs';
import { compile } from '@fleet-sdk/compiler';

import { logger } from './logger.js';


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
    'ticketRedeem'
]

export type ScriptNamesType = 'service' | 'inactiveRaffle' | 'ticketRepo' | 'activeRaffle' |
                    'winner' | 'ticket' | 'successRaffle' | 'winnerPrize' |
                    'gift' | 'giftRedeem' | 'ticketRedeem';
export type ContextVarsType = Map<ScriptNamesType, Map<string, string>>;


export function compileAll(contextVars?: ContextVarsType): Map<ScriptNamesType, string> {
    let contracts: Map<ScriptNamesType, string> = new Map<ScriptNamesType, string>();

    for(const scriptName of scriptList) {
        const scriptVars = contextVars !== undefined
            ? (contextVars.get(scriptName as ScriptNamesType) || new Map<string, string>())
            : new Map<string, string>();
        let script: string = fs.readFileSync(`./scripts/${scriptName}.es`,'utf8');
        for(const v of scriptVars) {
            script = script.replace(v[0], v[1]);
        }
        try {
            let contract = compile(script)
            contracts.set(scriptName as ScriptNamesType, contract.toAddress().toString());
        } catch(err) {
            logger.error(`The compileAll function raised error: ${err}`);
            throw err;
        }
    }
    logger.info(`The compileAll function done successful`);

    return contracts;
}
