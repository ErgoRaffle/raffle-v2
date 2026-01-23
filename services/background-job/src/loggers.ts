import CallbackLogger from '@rosen-bridge/callback-logger';
import WinstonLogger from '@rosen-bridge/winston-logger';

import { configs, getLogOptions } from './config';

const callbackLogger = new CallbackLogger(
  WinstonLogger.createLogger(getLogOptions(configs.logs)),
);

export default callbackLogger;
