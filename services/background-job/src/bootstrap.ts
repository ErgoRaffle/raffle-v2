// sort-imports-begin-ignore
import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import CallbackLogger from '@rosen-bridge/callback-logger';
import '@rosen-bridge/extended-typeorm';
// sort-imports-end-ignore

import WinstonLogger from '@rosen-bridge/winston-logger';

import packageJson from '../package.json' with { type: 'json' };
import { configs, getLogOptions } from './config';

DefaultLogger.init(
  new CallbackLogger(WinstonLogger.createLogger(getLogOptions(configs.logs))),
);
const logger = DefaultLogger.getInstance().child(import.meta.url);

logger.info(`Raffle background-service version: ${packageJson.version}`);
