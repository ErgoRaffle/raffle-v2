import { ServiceManager } from '@rosen-bridge/service-manager';
import { configs } from './config';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { DbService } from './services/dbService';
import './bootstrap';
import dataSource from './dataSource';
import { ScannerService } from './services/scannerService';
import { TxPotService } from './services/txPotService';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);

const main = async () => {
  const serviceManager = ServiceManager.setup();

  logger.debug('Initializing database service');
  DbService.init(
    dataSource,
    CallbackLoggerFactory.getInstance().getLogger('DbService'),
  );
  serviceManager.register(DbService.getInstance());
  logger.debug('Database service registered to the service manager');

  logger.debug('Initializing scanner service');
  await ScannerService.init(configs.scanner, DbService.getInstance());
  serviceManager.register(ScannerService.getInstance());
  logger.debug('Scanner service registered to the service manager');

  logger.debug('Initializing txpot service');
  await TxPotService.init(
    configs.txpot.updateInterval,
    dataSource,
    configs.scanner.node.url,
    configs.txpot.txRequiredConfirmations,
    CallbackLoggerFactory.getInstance().getLogger('TxPotService'),
  );
  serviceManager.register(TxPotService.getInstance());
  logger.debug('Txpot service registered to the service manager');

  logger.debug('Starting service manager...');
  await serviceManager.start(ScannerService.getInstance().getName());
  await serviceManager.start(TxPotService.getInstance().getName());
};

main();
