import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import { AbstractPotChainManager } from '@rosen-bridge/tx-pot';
import ErgoNodeNetwork from '../network/ergoNodeNetwork';
import { deserializeTransaction } from '@fleet-sdk/serializer';

export class ErgoNetworkInterface extends AbstractPotChainManager {
  readonly network: ErgoNodeNetwork;

  constructor(
    nodeUrl: string,
    private txRequiredConfirmations: number,
    private logger: AbstractLogger = new DummyLogger(),
  ) {
    super();
    this.network = new ErgoNodeNetwork(nodeUrl, this.logger);
  }

  /**
   * gets the blockchain current height
   *
   * @return {Promise<number>}
   * @memberof ErgoNetworkInterface
   */
  getHeight = (): Promise<number> => this.network.getHeight();

  /**
   * returns required number of confirmation
   *
   * @return {number}
   * @memberof ErgoNetworkInterface
   */
  getTxRequiredConfirmation = (): number => this.txRequiredConfirmations;

  /**
   * gets number of confirmation for a tx returns -1 if tx is not in the
   * blockchain
   *
   * @param {string} txId
   * @return {*}  {Promise<number>}
   * @memberof ErgoNetworkInterface
   */
  getTxConfirmation = (txId: string): Promise<number> =>
    this.network.getTxConfirmation(txId);

  /**
   * checks if a tx is still valid and can be sent to the network
   *
   * @param {string} serializedTx
   * @return {Promise<boolean>}
   * @memberof ErgoNetworkInterface
   */
  isTxValid = async (serializedTx: string): Promise<boolean> => {
    const tx = deserializeTransaction(serializedTx);

    const inputs = tx.inputs;
    for (let i = 0; i < inputs.length; i++) {
      const inputBoxId = inputs[i].boxId.toString();
      const isInputValid = await this.network.isBoxUnspentAndValid(inputBoxId);
      if (!isInputValid) {
        this.logger.debug(`input box with id=[${inputBoxId}] is not valid`);
        return false;
      }
    }

    return true;
  };

  /**
   * submits a tx to the blockchain
   *
   * @param {string} serializedTx
   * @return {Promise<void>}
   * @memberof ErgoNetworkInterface
   */
  submitTransaction = (serializedTx: string): Promise<void> =>
    this.network.submitTransaction(
      Buffer.from(serializedTx, 'base64').toString('hex'),
    );

  /**
   * checks if a tx is in mempool returns false if the chain has no mempool
   *
   * @param {string} txId
   * @return {Promise<boolean>}
   * @memberof ErgoNetworkInterface
   */
  isTxInMempool = async (txId: string): Promise<boolean> => {
    return this.network.isTxInMempool(txId);
  };
}
