// sort-imports-begin-ignore
import '@rosen-bridge/extended-typeorm';

import packageJson from '../package.json' with { type: 'json' };
// sort-imports-end-ignore

import callbackLogger from './loggers';

const logger = callbackLogger.child(import.meta.url);

logger.info(`Raffle background-service version: ${packageJson.version}`);
