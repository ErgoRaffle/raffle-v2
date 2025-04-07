import { ServiceManager } from '@rosen-bridge/service-manager';
import WinstonLogger from '@rosen-bridge/winston-logger';
import { getConfig } from './config/config';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { DBService } from './services/db';
import './bootstrap';
import dataSource from './dataSource';

CallbackLoggerFactory.init(new WinstonLogger(getConfig().logger.transports));
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const main = async () => {
  logger.debug('Initializing database service');
  DBService.init(dataSource, logger);
  const serviceManager = ServiceManager.getInstance();
  const dbServices = DBService.getInstances();
  for (const key of Object.keys(dbServices))
    serviceManager.register(dbServices[key]);
  logger.debug('Database service registered to the service manager');
};

main();
