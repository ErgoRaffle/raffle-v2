import * as fs from 'fs';
import { exit } from 'process';

import { program } from 'commander';

import { logger } from '../lib/logger';
import { ContextVarsType, RaffleContextVarsInterface } from '../lib/types';
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

    let inputs: ContextVarsType = new Map();

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
      ) as ContextVarsType;
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
      rawConfigs = JSON.parse(
        fs.readFileSync(config).toString(),
      ) as RaffleContextVarsInterface as unknown as {
        [key: string]: string | number | object;
      };
    } catch (err) {
      logger.error(`The config file is not valid: \n${err}`);
      process.exit(0);
    }

    const tokens = rawConfigs['serviceTokens'];
    const configs = new Map(
      Object.entries({
        defaults: {
          SERVICE_NFT_B64: Buffer.from(
            rawConfigs['SERVICE_NFT'].toString(),
            'hex',
          ).toString('base64'),
          OWNER_NFT_B64: Buffer.from(
            rawConfigs['OWNER_NFT'].toString(),
            'hex',
          ).toString('base64'),
          RAFFLE_LICENSE_B64: Buffer.from(
            rawConfigs['RAFFLE_LICENSE'].toString(),
            'hex',
          ).toString('base64'),
          ORACLE_TOKEN_ID_B64: Buffer.from(
            rawConfigs['ORACLE_TOKEN_ID'].toString(),
            'hex',
          ).toString('base64'),
          GIFT_TOKEN_COUNT: rawConfigs['GIFT_TOKEN_COUNT'],
        },
        service: {},
        ticketRepo: {},
        inactiveRaffle: {},
        activeRaffle: {},
        winner: {},
        successRaffle: {},
      }),
    );

    try {
      contracts = compileAll(configs as unknown as ContextVarsType);
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

    fs.writeFileSync(
      './dist/index.d.ts',
      `\
export const raffleInfo: {
  "addresses": {
        "ticketRepo": string,
        "ticket": string,
        "successRaffle": string,
        "winnerPrize": string,
        "gift": string,
        "giftRedeem": string,
        "giftTokenRepo": string,
        "ticketRedeem": string,
        "activeRaffle": string,
        "winner": string,
        "raffleDetails": string,
        "inactiveRaffle": string,
        "service": string
    },
    "tokens": {
        "ServiceNft": string,
        "RaffleLicense": string
    }
};
`,
    );
  });

program.parse(process.argv);
