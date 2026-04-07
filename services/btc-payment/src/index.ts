import './bootstrap';

import { DefaultLogger } from '@rosen-bridge/abstract-logger';
import { ServiceManager } from '@rosen-bridge/service-manager';

import { configs } from './configs';
import { InitializerService } from './services/initializerService';

const logger = DefaultLogger.getInstance().child(import.meta.url);

const main = async () => {
  // TODO: remove this once we have a proper reader for the configs
  configs.ergo.fee = BigInt(configs.ergo.fee);
  configs.donation.fee = BigInt(configs.donation.fee);
  const serviceManager = ServiceManager.setup();

  logger.debug('Initializing services');
  await InitializerService.init(serviceManager, logger.child('Initializer'));
  serviceManager.register(InitializerService.getInstance());
  logger.debug('Initializer service registered to the service manager');

  logger.debug('Starting service manager...');
  await serviceManager.start(InitializerService.getInstance().getName());
  logger.info('All services started successfully');
};

main();
