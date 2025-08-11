import { ServiceManager } from '@rosen-bridge/service-manager';
import { configs } from './config';
import { CallbackLoggerFactory } from '@rosen-bridge/callback-logger';

import { DbService } from './services/dbService';
import './bootstrap';
import dataSource from './dataSource';
import { ScannerService } from './services/scannerService';
import { TxPotService } from './services/txPotService';
import { HealthCheckService } from './services/healthCheckService';

const logger = CallbackLoggerFactory.getInstance().getLogger(import.meta.url);
const healthCheckLogger = CallbackLoggerFactory.getInstance().getLogger(
  'health-check-service',
);

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

  logger.debug('Initializing health check service');
  await HealthCheckService.init(
    configs.healthCheck.updateInterval,
    healthCheckLogger,
  );
  serviceManager.register(HealthCheckService.getInstance());
  logger.debug('Health check service registered to the service manager');

  logger.debug('Starting service manager...');
  serviceManager.start(ScannerService.getInstance().getName());
  serviceManager.start(TxPotService.getInstance().getName());
  serviceManager.start(HealthCheckService.getInstance().getName());

  // Keep the process running indefinitely
  await new Promise(() => {});
};

main();
