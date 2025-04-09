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
  const serviceManager = ServiceManager.setup();
  serviceManager.register(DBService.getInstance());
  logger.debug('Database service registered to the service manager');
  logger.debug('Starting service manager...');
  await serviceManager.start(DBService.getInstance().getName());
};

main();
