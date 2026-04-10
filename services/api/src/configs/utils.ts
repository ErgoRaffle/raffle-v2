import { TransportOptions } from '@rosen-bridge/winston-logger';

import { Logs } from '../types';

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
