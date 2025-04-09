import config from 'config';
import { cloneDeep } from 'lodash-es';
import { TransportOptions } from '@rosen-bridge/winston-logger';
import { DataBaseOption } from '../types';

interface ConfigType {
  logger: LoggerConfig;
  database: DBConfig;
}

const getOptionalString = (path: string, defaultValue = '') => {
  if (config.has(path)) {
    return config.get<string>(path);
  }
  return defaultValue;
};

class LoggerConfig {
  transports: TransportOptions[];

  constructor() {
    const logs = config.get<TransportOptions[]>('logs');
    const clonedLogs = cloneDeep(logs);
    const wrongLogTypeIndex = clonedLogs.findIndex((log) => {
      const logTypeValidation = ['console', 'file', 'loki'].includes(log.type);
      let loggerChecks = true;
      if (log.type === 'loki') {
        const overrideLokiBasicAuth = getOptionalString(
          'overrideLokiBasicAuth',
        );
        if (overrideLokiBasicAuth !== '') log.basicAuth = overrideLokiBasicAuth;
        loggerChecks =
          log.host != undefined &&
          typeof log.host === 'string' &&
          log.level != undefined &&
          typeof log.level === 'string' &&
          (log.serviceName ? typeof log.serviceName === 'string' : true) &&
          (log.basicAuth ? typeof log.basicAuth === 'string' : true);
      } else if (log.type === 'file') {
        loggerChecks =
          log.path != undefined &&
          typeof log.path === 'string' &&
          log.level != undefined &&
          typeof log.level === 'string' &&
          log.maxSize != undefined &&
          typeof log.maxSize === 'string' &&
          log.maxFiles != undefined &&
          typeof log.maxFiles === 'string';
      }
      return !(loggerChecks && logTypeValidation);
    });
    if (wrongLogTypeIndex >= 0) {
      throw new Error(
        `unexpected config at path ${`logs[${wrongLogTypeIndex}]`}: ${JSON.stringify(
          logs[wrongLogTypeIndex],
        )}`,
      );
    }
    this.transports = clonedLogs;
  }
}

class DBConfig {
  type: 'sqlite' | 'postgres';
  // sqlite options
  path: string;
  // postgres options
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;

  constructor() {
    const database = config.get<DataBaseOption>('database');
    const clonedDatabase = cloneDeep(database);
    this.type = clonedDatabase.type;
    if (clonedDatabase.type == 'sqlite') {
      if (!clonedDatabase.path)
        throw new Error('Invalid SQLite database path.');
      this.path = clonedDatabase.path;
    } else if (clonedDatabase.type == 'postgres') {
      if (!clonedDatabase.host)
        throw new Error('Invalid Postgres database host.');
      if (!clonedDatabase.port)
        throw new Error('Invalid Postgres database port.');
      if (!clonedDatabase.user)
        throw new Error('Invalid Postgres database user.');
      if (!clonedDatabase.password)
        throw new Error('Invalid Postgres database password.');
      if (!clonedDatabase.name)
        throw new Error('Invalid Postgres database name.');

      this.host = clonedDatabase.host;
      this.port = clonedDatabase.port;
      this.user = clonedDatabase.user;
      this.password = clonedDatabase.password;
      this.name = clonedDatabase.name;
    } else {
      throw new Error(`Database type=[${this.type}] not supported`);
    }
  }
}

let internalConfig: ConfigType | undefined;

const getConfig = (): ConfigType => {
  if (internalConfig == undefined) {
    const loggerConfig = new LoggerConfig();
    const dbConfig = new DBConfig();

    internalConfig = {
      logger: loggerConfig,
      database: dbConfig,
    };
  }
  return internalConfig;
};

export { getConfig };
