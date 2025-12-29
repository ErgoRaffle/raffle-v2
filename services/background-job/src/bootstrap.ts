// sort-imports-begin-ignore
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import '@rosen-bridge/extended-typeorm';
// sort-imports-end-ignore

import WinstonLogger from '@rosen-bridge/winston-logger';

import packageJson from '../package.json' with { type: 'json' };
import { configs, getLogOptions } from './config';

CallbackLoggerFactory.init(new WinstonLogger(getLogOptions(configs.logs)));
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

logger.info(`Raffle background-service version: ${packageJson.version}`);
