import { DataSource } from 'typeorm';
import * as ergoLib from 'ergo-lib-wasm-nodejs';
import { Buffer } from 'buffer';
import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  AbstractInitializableErgoExtractor,
  OutputBox,
  ErgoNetworkType,
} from '@rosen-bridge/abstract-extractor';

import { InactiveRaffleAction } from '../actions/inactiveRaffle';
import { InactiveRaffleBoxInterface } from '../interfaces/types';
import JsonBI from '@rosen-bridge/json-bigint';
import { InactiveRaffle } from '../entities';

export class InactiveRaffleExtractor extends AbstractInitializableErgoExtractor<
  InactiveRaffleBoxInterface,
  InactiveRaffle
> {
  readonly actions: InactiveRaffleAction;
  private readonly id: string;
  private readonly networkType: ergoLib.NetworkPrefix;
  private readonly ergoTree?: string;
  private readonly licenseTokenId: string;
  private readonly serviceErgoTree: string;
  private readonly implementorErgoTree: string;
  private readonly creatorErgoTree: string;
  private readonly winnersPercentList: string;

  constructor(
    dataSource: DataSource,
    id: string,
    networkType: ergoLib.NetworkPrefix,
    url: string,
    type: ErgoNetworkType,
    address: string,
    licenseTokenId: string,
    serviceErgoTree: string,
    implementorErgoTree: string,
    creatorErgoTree: string,
    winnersPercentList: string,
    logger?: AbstractLogger,
    initialize = true,
  ) {
    super(type, url, address, logger, initialize);
    this.id = id;
    this.licenseTokenId = licenseTokenId;
    this.networkType = networkType;
    this.ergoTree = address
      ? ergoLib.Address.from_base58(address).to_ergo_tree().to_base16_bytes()
      : undefined;
    this.actions = new InactiveRaffleAction(dataSource, this.logger);
    this.serviceErgoTree = serviceErgoTree;
    this.implementorErgoTree = implementorErgoTree;
    this.creatorErgoTree = creatorErgoTree;
    this.winnersPercentList = winnersPercentList;
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
      box.ergoTree == this.ergoTree &&
      box.assets?.at(0)?.tokenId == this.licenseTokenId &&
      (box.assets!.length == 1 || box.assets!.length == 2)
    );
  };

  /**
   * extract box data to proper format (not including spending information)
   * @param box
   * @return extracted data in proper format
   */
  extractBoxData = (box: OutputBox): InactiveRaffleBoxInterface | undefined => {
    const ergoBox = ergoLib.ErgoBox.from_json(JsonBI.stringify(box));
    const R4Serialized = ergoBox
      .register_value(ergoLib.NonMandatoryRegisterId.R4)!
      .to_i64_str_array();

    const data = {
      boxId: ergoBox.box_id().to_str(),
      txId: box.transactionId,
      serialized: Buffer.from(ergoBox.sigma_serialize_bytes()).toString(
        'base64',
      ),
      extractor: this.id,
      serviceErgoTree: this.serviceErgoTree,
      implementorErgoTree: this.implementorErgoTree,
      creatorErgoTree: this.creatorErgoTree,
      winnersPercent: R4Serialized[0],
      serviceFeePercent: R4Serialized[1],
      implementerFeePercent: R4Serialized[2],
      ticketPrice: R4Serialized[3],
      goal: R4Serialized[4],
      deadline: R4Serialized[5],
      winnersPercentList: this.winnersPercentList,
      txFee: R4Serialized[6],
    };

    return data;
  };
}
