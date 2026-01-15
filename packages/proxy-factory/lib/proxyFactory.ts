import { Network } from '@fleet-sdk/core';

import { AddGiftProxyGenerator } from './generators/addGiftProxyGenerator';
import { CreationProxyGenerator } from './generators/creationProxyGenerator';
import { DonationProxyGenerator } from './generators/donationProxyGenerator';

/**
 * Main factory class for generating proxy contracts
 * Provides a unified interface for all proxy generation operations
 */
export class ProxyFactory {
  private readonly creationGenerator: CreationProxyGenerator;
  private readonly donationGenerator: DonationProxyGenerator;
  private readonly addGiftGenerator: AddGiftProxyGenerator;
  private static instance: ProxyFactory;

  constructor(networkType: Network = Network.Mainnet) {
    this.creationGenerator = new CreationProxyGenerator(networkType);
    this.donationGenerator = new DonationProxyGenerator(networkType);
    this.addGiftGenerator = new AddGiftProxyGenerator(networkType);
  }

  static init = (networkType: Network = Network.Mainnet): void => {
    if (this.instance) return;
    this.instance = new ProxyFactory(networkType);
  };

  static getInstance = (): ProxyFactory => {
    if (!this.instance) {
      throw new Error(`${ProxyFactory.name} is not initialized`);
    }
    return this.instance;
  };

  /**
   * Get the creation proxy generator instance
   * @returns CreationProxyGenerator instance
   */
  getCreationGenerator = (): CreationProxyGenerator => {
    return this.creationGenerator;
  };

  /**
   * Get the donation proxy generator instance
   * @returns DonationProxyGenerator instance
   */
  getDonationGenerator = (): DonationProxyGenerator => {
    return this.donationGenerator;
  };

  /**
   * Get the add gift proxy generator instance
   * @returns AddGiftProxyGenerator instance
   */
  getAddGiftGenerator = (): AddGiftProxyGenerator => {
    return this.addGiftGenerator;
  };
}
