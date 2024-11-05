import * as fs from 'fs';
import { exit } from 'process';

import { program } from 'commander';

import { logger } from '../lib/logger';
import { ContextVarsType } from '../lib/types';
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

// build final release index.js file
program
  .command('build')
  .argument(
    '-c, --config <config file path>',
    'Address of input file that contains JSON contract name and variables',
  )
  .action((config) => {
    let configs;
    let contracts;

    try {
      configs = new Map(
        Object.entries(JSON.parse(fs.readFileSync(config).toString())),
      );
    } catch (err) {
      logger.error(`The config file is not valid: \n${err}`);
      process.exit(0);
    }

    try {
      contracts = compileAll(configs as ContextVarsType);
    } catch (err) {
      logger.error(`Compile Error: \n${err}`);
      process.exit(0);
    }

    const RaffleAddressesAndTokens = {
      addresses: contracts,
      tokens: configs.get('tokens'),
    };

    fs.writeFileSync(
      './dist/index.js',
      `\
export const raffleInfo = ${JSON.stringify(RaffleAddressesAndTokens, null, 4)};
`,
    );
  });

program.parse(process.argv);
