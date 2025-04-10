import { ServiceManager } from '@rosen-bridge/service-manager';
import WinstonLogger from '@rosen-bridge/winston-logger';
import { getConfig } from './config/config';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { DBService } from './services/db';
import './bootstrap';
import dataSource from './dataSource';
import { ScannerService } from './services/scanner';

CallbackLoggerFactory.init(new WinstonLogger(getConfig().logger.transports));
const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const main = async () => {
  const serviceManager = ServiceManager.setup();

  logger.debug('Initializing database service');
  DBService.init(dataSource, logger);
  serviceManager.register(DBService.getInstance());
  logger.debug('Database service registered to the service manager');

  logger.debug('Initializing scanner service');
  ScannerService.init(getConfig().scanner, DBService.getInstance(), logger);
  serviceManager.register(ScannerService.getInstance());
  logger.debug('Scanner service registered to the service manager');

  logger.debug('Starting service manager...');
  await serviceManager.start(DBService.getInstance().getName());
  await serviceManager.start(ScannerService.getInstance().getName());
};

main();
