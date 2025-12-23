import 'reflect-metadata';
import WinstonLogger from '@rosen-bridge/winston-logger';
import { configs, getLogOptions } from './config';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import packageJson from '../package.json' with { type: 'json' };

CallbackLoggerFactory.init(new WinstonLogger(getLogOptions(configs.logs)));
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

logger.info(`Raffle background-service version: ${packageJson.version}`);
