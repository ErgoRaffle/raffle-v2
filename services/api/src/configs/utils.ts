import { ConfigValidator } from '@rosen-bridge/config';
import { TransportOptions } from '@rosen-bridge/winston-logger';
import config from 'config';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { Logs, ApiConfig } from '../types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Converts log configurations to an array of TransportOptions based on their type.
 */
export const getLogOptions = (logConfigs: Logs[] = []): TransportOptions[] => {
  const logOptions: TransportOptions[] = [];
  for (const log of logConfigs) {
    switch (log.type) {
      case 'console':
        logOptions.push({ type: log.type, level: log.level });
        break;
      case 'file':
        logOptions.push({
          type: log.type,
          level: log.level,
          path: log.path!,
          maxSize: log.maxSize!,
          maxFiles: log.maxFiles!,
        });
        break;
      case 'loki':
        logOptions.push({
          type: log.type,
          level: log.level,
          serviceName: log.serviceName,
          host: log.host!,
          basicAuth: log.basicAuth,
        });
        break;
    }
  }
  return logOptions;
};

/**
 * Validates configs using the config schema and returns typed config object.
 */
export const validateConfigs = (): ApiConfig => {
  const rawSchemaData = fs.readFileSync(
    path.join(__dirname, '../../config/schema.json'),
    'utf-8',
  );
  const schema = JSON.parse(rawSchemaData);
  const confValidator = new ConfigValidator(schema);
  const configs = config.util.toObject();
  confValidator.validateConfig(configs);

  return configs;
};
