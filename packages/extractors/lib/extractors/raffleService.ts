import { DataSource } from 'typeorm';
import * as ergoLib from 'ergo-lib-wasm-nodejs';
import { Buffer } from 'buffer';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  boxHasToken,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { RaffleServiceAction } from '../actions/raffleService';
import { RaffleServiceBoxInterface } from '../interfaces/types';
import JsonBI from '@rosen-bridge/json-bigint';

export class RaffleServiceExtractor extends AbstractInitializableErgoExtractor<RaffleServiceBoxInterface> {
  readonly actions: RaffleServiceAction;
  private readonly id: string;
  private readonly networkType: ergoLib.NetworkPrefix;
  private readonly ergoTree?: string;
  private readonly serviceNFTId: string;

  constructor(
    dataSource: DataSource,
    id: string,
    networkType: ergoLib.NetworkPrefix,
    url: string,
    type: ErgoNetworkType,
    address: string,
    serviceNFTId: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.networkType = networkType;
    this.ergoTree = address
      ? ergoLib.Address.from_base58(address).to_ergo_tree().to_base16_bytes()
      : undefined;
    this.serviceNFTId = serviceNFTId;
    this.actions = new RaffleServiceAction(dataSource, this.logger);
  }

  /**
   * get Id for current extractor
   */
  getId = () => `${this.id}`;

  /**
   * check proper data format in the box
   * @param box
   * @return true if the box has the required data and false otherwise
   */
  hasData = (box: OutputBox): boolean => {
    return (
      box.ergoTree == this.ergoTree && boxHasToken(box, [this.serviceNFTId])
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): RaffleServiceBoxInterface | undefined => {
    const ergoBox = ergoLib.ErgoBox.from_json(JsonBI.stringify(box));
    const R4Serialized = ergoBox
      .register_value(ergoLib.NonMandatoryRegisterId.R4)!
      .to_i64_str_array();

    const data = {
      boxId: ergoBox.box_id().to_str(),
      txId: box.transactionId,
      boxSerialized: Buffer.from(ergoBox.sigma_serialize_bytes()).toString(
        'base64',
      ),
      serviceFeePercent: R4Serialized[0],
      implementerFeePercent: R4Serialized[1],
      creationFee: R4Serialized[2],
      extractor: this.id,
    };

    return data;
  };
}
