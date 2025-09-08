import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractService,
  Dependency,
  ServiceStatus,
} from '@rosen-bridge/service-manager';
import {
  ErgoBox,
  ErgoAddress,
  OutputBuilder,
  TransactionBuilder,
  Network,
} from '@fleet-sdk/core';
import { ErgoHDKey } from '@fleet-sdk/wallet';
import { serializeTransaction } from '@fleet-sdk/serializer';
import { raffleInfo } from '@ergo-raffle/contracts';

import ErgoNodeNetwork from '../network/ergoNodeNetwork';
import { signTransaction } from '../transactions/utils';
import { configs } from '../config';

export class OracleBoxService extends AbstractService {
  name = 'OracleBoxService';
  protected dependencies: Dependency[] = [];
  private static instance?: OracleBoxService;
  private network: ErgoNodeNetwork;
  private scheduledJob?: NodeJS.Timeout;
  private isJobRunning = false;
  private continueStop = () => {
    return;
  };
  private shouldStopJob = false;
  private readonly HARDCODED_SECRET = '';
  private readonly FEE = 1_500_000n;

  private constructor(
    private interval: number,
    logger?: AbstractLogger,
  ) {
    super(logger);
    this.network = new ErgoNodeNetwork(configs.scanner.node.url, logger);
  }

  /**
   * initializes the singleton instance of OracleBoxService
   *
   * @static
   * @param {number} interval
   * @param {AbstractLogger} [logger]
   * @memberof OracleBoxService
   */
  static init = (interval: number, logger?: AbstractLogger) => {
    if (this.instance != undefined) {
      return;
    }
    this.instance = new OracleBoxService(interval, logger);
  };

  /**
   * returns the singleton instance of OracleBoxService
   *
   * @static
   * @return {OracleBoxService}
   * @memberof OracleBoxService
   */
  static getInstance = (): OracleBoxService => {
    if (!this.instance) {
      throw new Error('OracleBoxService instance is not initialized yet');
    }
    return this.instance;
  };

  /**
   * starts the service. following steps are performed:
   *  - starts the oracle box monitoring job
   *  - service status is set to running
   *
   * @protected
   * @return {Promise<boolean>} true if service started successfully, otherwise
   * false
   * @memberof OracleBoxService
   */
  protected start = async (): Promise<boolean> => {
    this.job();
    this.setStatus(ServiceStatus.running);
    this.logger.info(`Oracle box service started`);
    return true;
  };

  /**
   * stops the service. following steps are performed:
   *  - stops the oracle box monitoring job
   *  - service's status is set to dormant
   *
   * @protected
   * @return {Promise<boolean>} true if service stopped successfully, otherwise
   * false
   * @memberof OracleBoxService
   */
  protected stop = async (): Promise<boolean> => {
    try {
      if (this.isJobRunning) {
        await new Promise<void>((resolve) => {
          this.shouldStopJob = true;
          this.continueStop = resolve;
        });
      }
      clearTimeout(this.scheduledJob);
      this.setStatus(ServiceStatus.dormant);
      this.logger.info('Oracle box service stopped');
    } catch (e) {
      this.logger.error(
        `Something went wrong while stopping the ${this.name}: ${e}`,
      );
      return false;
    }
    return true;
  };

  /**
   * executes oracle box monitoring job and schedules its next run
   *
   * @protected
   * @return {Promise<void>}
   * @memberof OracleBoxService
   */
  protected job = async (): Promise<void> => {
    try {
      this.isJobRunning = true;
      await this.findAndSendOracleBox();
      this.logger.debug('Oracle box monitoring job completed');
    } catch (e) {
      this.logger.warn(`Oracle box monitoring job failed: ${e}`);
      if (e instanceof Error && e.stack) {
        this.logger.debug(e.stack);
      }
    } finally {
      this.isJobRunning = false;
    }
    this.scheduledJob = setTimeout(this.job, this.interval * 1000);
    if (this.shouldStopJob) {
      this.shouldStopJob = false;
      this.continueStop();
    }
  };

  /**
   * Finds boxes containing the oracle token and sends them to the hardcoded address
   *
   * @private
   * @return {Promise<void>}
   * @memberof OracleBoxService
   */
  private findAndSendOracleBox = async (): Promise<void> => {
    try {
      // Get oracle token ID from raffleInfo
      const oracleTokenId = raffleInfo.tokens.oracleTokenId;
      this.logger.debug(
        `Looking for boxes with oracle token: ${oracleTokenId}`,
      );

      // Find boxes containing the oracle token
      const oracleBoxes =
        await this.network.getUnspentBoxesByTokenId(oracleTokenId);

      if (oracleBoxes.length === 0) {
        this.logger.debug('No oracle boxes found');
        return;
      }

      const oracleBox = oracleBoxes[0];
      await this.sendOracleBoxToAddress(oracleBox);
    } catch (error) {
      this.logger.error(`Error in findAndSendOracleBox: ${error}`);
      throw error;
    }
  };

  /**
   * Sends an oracle box to the hardcoded address
   *
   * @private
   * @param {ErgoBox} oracleBox
   * @return {Promise<void>}
   * @memberof OracleBoxService
   */
  private sendOracleBoxToAddress = async (
    oracleBox: ErgoBox,
  ): Promise<void> => {
    try {
      this.logger.info(
        `Sending oracle box ${oracleBox.boxId} to owner address`,
      );

      // Get current height for transaction building
      const height = await this.network.getHeight();

      // Create wallet from hardcoded secret
      const ownerKey = ErgoHDKey.fromMnemonicSync(
        this.HARDCODED_SECRET,
      ).deriveChild(0);
      const ownerAddress = ErgoAddress.fromBase58(
        ownerKey.address.encode(Network.Testnet),
      );

      const unsignedTx = new TransactionBuilder(height)
        .from([oracleBox])
        .to(
          new OutputBuilder(
            oracleBox.value - this.FEE,
            ownerAddress.toString(),
          ).addTokens(oracleBox.assets),
        )
        .payFee(this.FEE)
        .build();

      this.logger.debug(
        `Built transaction: ${JSON.stringify(unsignedTx.toEIP12Object())}`,
      );

      // Sign the transaction
      const signedTx = await signTransaction(this.network, unsignedTx, [
        ownerKey,
      ]);

      this.logger.debug('Transaction signed successfully');

      // Submit the transaction
      const serializedTx = Buffer.from(
        serializeTransaction(signedTx).toBytes(),
      ).toString('hex');
      await this.network.submitTransaction(serializedTx);

      this.logger.info(
        `Successfully sent oracle box ${oracleBox.boxId} to ${ownerAddress.toString()}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending oracle box ${oracleBox.boxId}: ${error}`,
      );
      throw error;
    }
  };
}
