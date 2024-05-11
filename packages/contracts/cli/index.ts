import * as fs from 'fs';
import { exit } from 'process';

import { program } from 'commander';

import { logger } from '../lib/logger';
import { ContextVarsType } from '../lib/types';
import { compileAll } from '../lib/utils';
import { defaultScriptsVariables } from '../constants';

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
  .argument('<destination>', 'Destination address of file')
  .action((destination) => {
    logger.info('Create input file template started');

    let fileCreatedSuccess = false;
    try {
      fs.writeFileSync(
        destination,
        JSON.stringify(
          defaultScriptsVariables,
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

program.parse();
