import * as fs from 'fs';
import { exit } from 'process';

import { program } from 'commander';

import { logger } from './logger';
import { compileAll, ContextVarsType } from './utils';

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
  .option(
    '-i, --input <intput file path>',
    'Address of intput file that contains JSON contract name and variables',
  )
  .action((options) => {
    logger.info('compile-all command started');

    let inputs: ContextVarsType = new Map();
    if (options.input) {
      let inputContent = '';
      try {
        inputContent = fs.readFileSync(options.input).toString();
      } catch (err) {
        logger.error(`Error: ${err}`);
        logger.info('compile-all command failed');
        exit(1);
      }

      try {
        inputs = new Map(
          Object.entries(JSON.parse(inputContent)),
        ) as ContextVarsType;
      } catch (err) {
        logger.error(`Error: Input file is not json`);
        logger.info('compile-all command failed');
        exit(1);
      }
    }

    let contracts = {};
    try {
      contracts = compileAll(inputs);
    } catch (err) {
      logger.error(`Error: ${err}`);
      logger.info('compile-all failed');
      exit(1);
    }

    if (options.output) {
      try {
        fs.writeFileSync(options.output, JSON.stringify(contracts, null, 4));
      } catch (err) {
        logger.error(`The compileAll function raised error: ${err}`);
        throw err;
      }
    } else {
      console.log(JSON.stringify(contracts, null, 4));
    }

    logger.info('compile-all command ran successfull');
  });

// Create template file of input variables
program
  .command('make-input-template')
  .argument('<destination>', 'Destination address of file')
  .action((destination) => {
    logger.info('Create input file template started');
    const scriptVariables = {
      service: {},
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

    try {
      fs.writeFileSync(destination, JSON.stringify(scriptVariables, null, 4));
    } catch (err) {
      logger.error(`Error: ${err}`);
      logger.info('Create input file template failed');
    }

    logger.info('Create input file template command ran successfull');
  });

program.parse();
