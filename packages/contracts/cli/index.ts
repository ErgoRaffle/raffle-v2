import * as fs from 'fs';
import { exit } from 'process';

import { program } from 'commander';

import * as types from '../lib/types';
import { logger } from '../lib/logger';
import { compileAll } from '../lib/utils';
import { defaultScriptsVariables, defaultBuildVariables } from '../constants';

program
  .name('contracts')
  .description('CLI to do operations related to contracts');

// compile-all related options
program
  .command('compile-contracts')
  .option(
    '-o, --output <output file path>',
    'Address of output file that contains contracts addresses',
  )
  .argument(
    '-i, --input <input file path>',
    'Address of input file that contains JSON contract name and variables',
  )
  .action((input, options) => {
    logger.info('compile-all command started');

    let inputs: types.ContextVarsType = new Map();

    let inputContent = '';
    try {
      inputContent = fs.readFileSync(input).toString();
    } catch (err) {
      logger.error(`The compile-all command failed: ${err}`);
      exit(1);
    }

    try {
      inputs = new Map(
        Object.entries(JSON.parse(inputContent)),
      ) as types.ContextVarsType;
    } catch (err) {
      logger.error(`The compile-all command failed: Input file is not json`);
      exit(1);
    }

    let contracts = {};
    try {
      contracts = compileAll(inputs);
    } catch (err) {
      logger.error(`The compile-all command failed: ${err}`);
      exit(1);
    }

    if (options.output) {
      try {
        fs.writeFileSync(options.output, JSON.stringify(contracts, null, 4));
      } catch (err) {
        logger.error(`The compileAll function raised error: ${err}`);
        exit(1);
      }
    } else {
      console.log(JSON.stringify(contracts, null, 4));
    }

    logger.info('compile-all command ran successful');
  });

// Create template file of input variables
program
  .command('make-input-template')
  .option('-b, --for-build', 'This flag determine purpose config is for build')
  .argument('<destination>', 'Destination address of file')
  .action((destination, options) => {
    logger.info('Create input file template started');

    const variables = options.forBuild
      ? defaultBuildVariables
      : defaultScriptsVariables;
    let fileCreatedSuccess = false;
    try {
      fs.writeFileSync(
        destination,
        JSON.stringify(
          variables,
          (key, value) =>
            typeof value === 'bigint' ? value.toString() : value,
          4,
        ),
      );
      fileCreatedSuccess = true;
    } catch (err) {
      logger.error(`Create input file template failed: ${err}`);
    }

    if (!fileCreatedSuccess)
      logger.info('Create input file template command ran successful');
  });

// build final release index.js & index.d.ts files
program
  .command('build')
  .argument(
    '-c, --config <config file path>',
    'Address of input file that contains JSON contract name and variables',
  )
  .action((config) => {
    let rawConfigs;
    let contracts;

    try {
      rawConfigs = JSON.parse(fs.readFileSync(config).toString()) as {
        [key: string]: string | number | object;
      };
    } catch (err) {
      logger.error(`The config file is not valid: \n${err}`);
      process.exit(0);
    }

    const tokens = rawConfigs['tokens'] as { [key: string]: string };
    const defaults = new Map<string, string>();
    defaults.set(
      'SERVICE_NFT_B64',
      Buffer.from(tokens['serviceNft'].toString(), 'hex').toString('base64'),
    );
    defaults.set(
      'OWNER_NFT_B64',
      Buffer.from(tokens['ownerNft'].toString(), 'hex').toString('base64'),
    );
    defaults.set(
      'RAFFLE_LICENSE_B64',
      Buffer.from(tokens['raffleLicense'].toString(), 'hex').toString('base64'),
    );
    defaults.set(
      'ORACLE_TOKEN_ID_B64',
      Buffer.from(tokens['oracleTokenId'].toString(), 'hex').toString('base64'),
    );
    defaults.set('GIFT_TOKEN_COUNT', rawConfigs['giftTokenCount'].toString());
    const configs = new Map<'defaults', Map<string, string>>();
    configs.set('defaults', defaults);

    try {
      contracts = compileAll(configs as types.ContextVarsType);
    } catch (err) {
      logger.error(`Compile Error: \n${err}`);
      process.exit(0);
    }

    const RaffleAddressesAndTokens = {
      addresses: contracts,
      tokens: tokens,
    };

    fs.writeFileSync(
      './dist/index.js',
      `\
export const raffleInfo = ${JSON.stringify(RaffleAddressesAndTokens, null, 4)};
`,
    );

    let addressesTypeString = '\n';
    const addressKeys = Object.keys(contracts);
    for (const contractName of addressKeys) {
      addressesTypeString += `        "${contractName}": string`;
      addressesTypeString +=
        contractName == addressKeys[addressKeys.length - 1] ? '' : ',\n';
    }

    let tokensTypeString = '\n';
    const tokenKeys = Object.keys(tokens);
    for (const tokenName of tokenKeys) {
      tokensTypeString += `        "${tokenName}": string`;
      tokensTypeString +=
        tokenName == tokenKeys[tokenKeys.length - 1] ? '' : ',\n';
    }

    fs.writeFileSync(
      './dist/index.d.ts',
      `\
export const raffleInfo: {
  "addresses": {${addressesTypeString}
    },
    "tokens": {${tokensTypeString}
    }
};
`,
    );
  });

program.parse(process.argv);
