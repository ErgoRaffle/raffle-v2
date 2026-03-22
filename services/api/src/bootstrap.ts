import '@rosen-bridge/extended-typeorm/bootstrap';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import CallbackLogger from '@rosen-bridge/callback-logger';
import WinstonLogger from '@rosen-bridge/winston-logger';

import packageJson from '../package.json' with { type: 'json' };
import { configs, getLogOptions } from './configs';

DefaultLogger.init(
  new CallbackLogger(WinstonLogger.createLogger(getLogOptions(configs.logs))),
);
const logger = DefaultLogger.getInstance().child(import.meta.url);

logger.info(`Raffle API service version: ${packageJson.version}`);
