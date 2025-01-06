import * as ergoLib from 'ergo-lib-wasm-nodejs';
import WinstonLogger from '@rosen-bridge/winston-logger';

export { RaffleService } from './entities/raffleService';
import { RaffleServiceExtractor } from './extractors/raffleService';
import * as scanner from '@rosen-bridge/scanner';
import { AppDataSource } from './dataSource.js';

const winstonLogger = new WinstonLogger([
  { type: 'console', level: 'debug' },
  {
    type: 'file',
    level: 'debug',
    path: './logs/',
    maxSize: '20m',
    maxFiles: '14d',
  },
]);
const logger = winstonLogger.getLogger(import.meta.url);

await AppDataSource.initialize();
await AppDataSource.runMigrations();

console.log('Migrated successfully');

const raffleServiceExtractor = new RaffleServiceExtractor(
  AppDataSource,
  'RaffleService',
  ergoLib.NetworkPrefix.Testnet,
  'http://176.9.15.237:9052/',
  scanner.ErgoNetworkType.Node,
  '3UKPoHPz8cubwxFCQTM8ogqFeF4WVp5rHXVEPsYvxwmxk95NZXDzzubxijdsXy34V1wN5ujU3q3t8yJexcEDaCyRqeuU7DuN2o4WbFFgoxHLA9WdMTkmWrrn1g1yQS1XrqP7Hebiqfyu6Tt4yMg5dD1j8cN2G23tkQksHeWtmTUwA4GJQYtT5JZJVTfriR9Ecf1vr7gXzXnpgWWhVd2DNEJw3jhnktxAK8k8ThUGCdytfdpCShgueywDPKrXCSYT2t4Ty4YPPp19X2UN588WBkoofMMzsKc8mg94MXmvHxQzDbu1mYabP3U2kLQ2R66F1XbU5ykEY7FppA5yM3E9w7SVQhiNZxys73oSFFVb5jXphJzaxMYJMeGQhNniynh6sTrXwGBoiCf1LwhJzNR4uA2aJArzvWMjK5rmx1Kvj6rKjGg4iFp77ddq9HRrHw4zCX19C61mrbNiHT76rkjof2nJeTNecGaWUV7AdSC7dipuKZvJa1ssUz5oDGHbfFzpR8dMZwqHbPkR1MjRCxXhC5ztzYGFGdVMD13uJGEKDSoAqsdCukVEHbW6T3y9dkPDYNFitQSGHnFR8E2tMaHPxYWfTY8KGYYsPq92vtfTPFPidzTe8tciwqeNvTsFQyYhCm32SnMPNBbJ3CVp6QYqDLnsxCQLSKjwg9TQ1hDXoJpZ4XwBPRRrFhdJUkthasQX619SiPXFnxme7PuVBCsGyk7crCQRcotaoaT4yaBANfUJYqvqjw7LbMfjTrTkspkVrhVQiPdFUgJ4mhXDwpUXkYtVRrUhp3fNo8vXPCLTpX4XJMhQ8X5p1Gi7BqBUfqXSRVeJS8Ub9EQtMEoc78tTzLemXzqreitGsVnHMnEDWC8UxRMMeE22ZGvXuTbTNnK6Xg5a6wxRw9MFsTbhaaDkuB36siG1a4tyKnn7Fq55WWc2yuP2N4Vw3MFpQEhzcBggA3vWCFT4v6tUMVjq3qZF1ZvNrSxKUmn4P7TMSu41H6GcgsJvVxjVXss36qHrMoSw8LpC1z2X7nybrBHuGZ8FjEtZAZ4WSauMB2RMUtQLVgDgu3QmAkGpHm6ysSeA7ksREyNH4GwpNeYRPzWSf7DuYPTKTVBgVUkSDpiaycqeJSm9rMp',
  undefined,
  logger,
  true,
);

const ergoScanner = new scanner.ErgoScanner(
  {
    url: 'http://176.9.15.237:9052/',
    type: scanner.ErgoNetworkType.Node,
    timeout: 1000000,
    initialHeight: 1566660,
    dataSource: AppDataSource,
  },
  logger,
);
ergoScanner.registerExtractor(raffleServiceExtractor);
await ergoScanner.update();
