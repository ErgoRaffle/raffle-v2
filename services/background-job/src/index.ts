import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { ServiceManager } from '@rosen-bridge/service-manager';

import './bootstrap';
import { configs } from './config';
import { InitializerService } from './services/initializerService';

const logger = DefaultLogger.getInstance().child(import.meta.url);

const main = async () => {
  const serviceManager = ServiceManager.setup();
  // TODO: remove this once we have a proper reader for the configs
  configs.ergo.fee = BigInt(configs.ergo.fee);

  logger.debug('Initializing services');
  await InitializerService.init(serviceManager, logger.child('Initializer'));
  serviceManager.register(InitializerService.getInstance());
  logger.debug('Initializer service registered to the service manager');

  logger.debug('Starting service manager...');
  await serviceManager.start(InitializerService.getInstance().getName());
  logger.info('All services started successfully');
};

main();
