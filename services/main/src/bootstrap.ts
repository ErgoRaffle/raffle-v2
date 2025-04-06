import 'reflect-metadata';
import WinstonLogger from '@rosen-bridge/winston-logger';
import { getConfig } from './config/config';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';
import packageJson from '../package.json' assert { type: 'json' };

CallbackLoggerFactory.init(new WinstonLogger(getConfig().logger.transports));
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

logger.info(`Raffle Extractor version: ${packageJson.version}`);
