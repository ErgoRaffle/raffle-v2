import * as fs from 'fs';
import * as process from 'process';

import { logger } from './lib/logger';
import { ContextVarsType } from './lib/types';
import { compileAll } from './lib/utils';

const configPath = process.env['RAFFLE_BUILD_CONFIG_PATH'] || './configs.json';
let configs;

try {
  configs = new Map(
    Object.entries(JSON.parse(fs.readFileSync(configPath).toString())),
  ) as ContextVarsType;
} catch (err) {
  logger.error(`The config file is not valid: \n${err}`);
  process.exit(1);
}

const contracts = compileAll(configs);

export const RaffleAddressesAndTokens = {
  addresses: contracts,
  tokens: configs['tokens'],
};

fs.writeFileSync(
  './raffle.json',
  JSON.stringify(RaffleAddressesAndTokens, null, 4),
);
