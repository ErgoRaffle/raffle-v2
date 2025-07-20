import { ServiceManager } from '@rosen-bridge/service-manager';
import { getConfig } from './config/config';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { DBService } from './services/db';
import './bootstrap';
import dataSource from './dataSource';
import { ScannerService } from './services/scanner';
import { TxPotService } from './services/TxPotService';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const main = async () => {
  const serviceManager = ServiceManager.setup();

  logger.debug('Initializing database service');
  DBService.init(
    dataSource,
    CallbackLoggerFactory.getInstance().getLogger('DbService'),
  );
  serviceManager.register(DBService.getInstance());
  logger.debug('Database service registered to the service manager');

  logger.debug('Initializing scanner service');
  await ScannerService.init(getConfig().scanner, DBService.getInstance());
  serviceManager.register(ScannerService.getInstance());
  logger.debug('Scanner service registered to the service manager');

  logger.debug('Initializing txpot service');
  await TxPotService.init(
    getConfig().txpot.updateInterval,
    dataSource,
    getConfig().scanner.node.url,
    getConfig().txpot.txRequiredConfirmations,
    CallbackLoggerFactory.getInstance().getLogger('TxPotService'),
  );
  serviceManager.register(TxPotService.getInstance());
  logger.debug('Txpot service registered to the service manager');

  logger.debug('Starting service manager...');
  await serviceManager.start(ScannerService.getInstance().getName());
  await serviceManager.start(TxPotService.getInstance().getName());
};

main();
