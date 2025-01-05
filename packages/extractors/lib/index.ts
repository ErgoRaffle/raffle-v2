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
  '3UKPoHPz8cubwxEyW1mgNGaoNUSFkUhMQa1La81kp5jPUMWcNpZdW4NToe5UeHZKCVmaDLU4efpcNPZ4bWPwo2L1pG6kYvwahiCMTkvzGZTVMCnbrF1zrMDTx2mPWzXukUE2tsjGXJ7Nb9XN9x39DurrCWj6kSTs2xCqXUdbCsa9oPBm1YszGRCSDBxbTVrQ9eePTPbUjbK1yEgp8wuxhbSLurz5QhPydpdUKUxr27S3F8fydCDpdH9T7NqBNfszddab25yVos6q7Nrqc1VoY4N2kHK7sxhmQrMmJyrv19HMn2Yysam1H5XAV5EPFSSj24xNLwJq5AJQvpCkusEpW9eaCdGmbvNEeRTisjBhhxtQGhXuAQxfuMt7S2tBKkgJdw9U6JXFbndvf3g6CQLM9MBMj76STzU8CsvbsqXaaXwN1hteagcffFDtAf4mwneca99XEiVDt848ge8HbMCgmEvpfYSJnWqiDiCufeDuD8NYjiXh5UGEJUG4bZLPPmoh8kGM1D4Xs1v4q5T8ZrBgnQXiusWUKx2T9p7tjVUZLpaw65Z5KFKJxAfpyN2FtrkwB95XnhsdCvpYEeiZcwr1Vfb8bzGjHsv6EweCSuntEHTNig3NBRGVAs8RTLDoA9nYpntW8aG1y6tZe5HoZ4n9QGJhysVp5zXoFSUbfr2yVJsU4oTxVNhzr8SD4nQ5mtY1ZQ41STeZQg4DdpcxrUXd5pq1VefRgaE7Pkj1bvsqgeUefCrAfFAmBrKaPSJy1QFEX8fvn3tWe363exkfcidJPbNj3xyjUfQ4EjtELSWzAq9toWRNp7H61atry5ee83KtYCZKJH6MnhK1tG1H83u1JQxa1AmikrHENHgdC47N2rmY2t8ozeWEZf8rBDnEdEhP8mtJZt1NtHToBuNBDM17P9zrsrNK9JKDQKP81i4KYaxTnhMhGGSvWvNXjSvu7aKk5sccHLF3VKkcC9C7dWp2A8nEUzCYTW8Eb5WfVqYGZtUNdgkyWAD55kpPKSmDpdoMPMRz99dbbGpeR8gY1wRdJDeZr8s2iDgPah8DXY9hvDLsg12No1yrFVqxgWQrXiVkVSBVFzhUeJjLTiBwzVqUHLWKbVxQZHWSYXHedq2geCcqUJ6',
  undefined,
  logger,
);

const ergoScanner = new scanner.ErgoScanner(
  {
    url: 'http://176.9.15.237:9052/',
    type: scanner.ErgoNetworkType.Node,
    timeout: 1000000,
    initialHeight: 1554700,
    dataSource: AppDataSource,
  },
  logger,
);
ergoScanner.registerExtractor(raffleServiceExtractor);
await ergoScanner.update();
