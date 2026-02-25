import { compile } from '@fleet-sdk/compiler';
import {
  ErgoAddress,
  Network,
  OutputBuilder,
  TokenAmount,
} from '@fleet-sdk/core';
import { readFileSync } from 'fs';
import { join } from 'path';

import { BaseProxyParams, ProxyGenerationResult } from '../types';

/**
 * Abstract base class for all proxy generators
 * Provides common functionality for ErgoScript contract parameter filling and address generation
 */
export abstract class BaseProxyGenerator<
  ErgoScriptParams extends BaseProxyParams,
> {
  protected readonly networkType: Network;
  protected readonly scriptsDir: string;
  protected abstract scriptName: string;
  protected readonly scriptAddress: string;

  constructor(networkType: Network = Network.Mainnet, scriptName: string) {
    this.networkType = networkType;
    this.scriptsDir = join(__dirname, '../scripts');
    const contractScript = this.loadScript(scriptName);
    this.scriptAddress = compile(contractScript, {})
      .toAddress(this.networkType)
      .toString();
  }

  /**
   * Load ErgoScript contract from scripts directory
   * @param scriptName - Name of the script file (without .es extension)
   * @returns ErgoScript contract content
   */
  protected loadScript = (scriptName: string): string => {
    try {
      const scriptPath = join(this.scriptsDir, `${scriptName}.es`);
      return readFileSync(scriptPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load script ${scriptName}.es: ${error}`);
    }
  };

  /**
   * Generate proxy address and compute required assets
   * @param params - Parameters to fill in the contract
   * @returns ProxyGenerationResult
   */
  generateProxy = (params: ErgoScriptParams): ProxyGenerationResult => {
    this.validateParams(params);
    const contractScript = this.loadScript(this.scriptName);

    const filledScript = this.fillContractParameters(contractScript, params);
    const proxyAddress = compile(filledScript, {})
      .toAddress(this.networkType)
      .toString();

    return {
      proxyAddress,
      requiredNanoErgs: this.calculateRequiredNanoErgs(params),
      requiredTokens: this.calculateRequiredTokens(params),
    };
  };

  /**
   * Generate proxy box for the transaction
   * @param params - Parameters to fill in the contract
   * @returns OutputBuilder instance
   */
  generateProxyBox = (params: ErgoScriptParams): OutputBuilder => {
    this.validateParams(params);

    const requiredNanoErgs = this.calculateRequiredNanoErgs(params);
    const requiredTokens = this.calculateRequiredTokens(params);

    let outputBuilder = new OutputBuilder(
      requiredNanoErgs,
      ErgoAddress.fromBase58(this.scriptAddress),
    ).addTokens(requiredTokens);

    outputBuilder = this.fillRegisters(outputBuilder, params);

    return outputBuilder;
  };

  /**
   * Fill box registers with contract parameters
   * @param outputBuilder - OutputBuilder instance
   * @param params - Contract parameters
   * @returns Updated OutputBuilder
   */
  protected abstract fillRegisters: (
    outputBuilder: OutputBuilder,
    params: ErgoScriptParams,
  ) => OutputBuilder;

  /**
   * Fill contract parameters into ErgoScript template
   * @param script - ErgoScript template
   * @param params - Parameters to fill
   * @returns Filled ErgoScript
   */
  protected abstract fillContractParameters: (
    script: string,
    params: ErgoScriptParams,
  ) => string;

  /**
   * Validate base proxy parameters (common to all proxy types)
   * @param params - Parameters to validate
   * @returns void
   * @throws Error if any base parameter is invalid
   */
  protected validateBaseParams = (params: BaseProxyParams): void => {
    if (!params.txFee || params.txFee <= 0n) {
      throw new Error('Valid transaction fee is required');
    }

    if (!params.expirationHeight || params.expirationHeight <= 0) {
      throw new Error('Valid expiration height is required');
    }

    if (!params.raffleDeadline || params.raffleDeadline <= 0) {
      throw new Error('Valid deadline is required');
    }
  };

  /**
   * Validate proxy parameters, throws error if any parameter is invalid
   * This method validates base parameters first, then calls validateSpecificParams
   * @param params - Parameters to validate
   * @returns void
   */
  protected validateParams = (params: ErgoScriptParams): void => {
    this.validateBaseParams(params);
    this.validateSpecificParams(params);
  };

  /**
   * Validate generator-specific parameters (to be implemented by each generator)
   * @param params - Parameters to validate
   * @returns void
   */
  protected abstract validateSpecificParams: (params: ErgoScriptParams) => void;

  /**
   * Calculate required nano ERGs for the transaction
   * @param params - Contract parameters
   * @returns Required nano ERGs
   */
  protected abstract calculateRequiredNanoErgs: (
    params: ErgoScriptParams,
  ) => bigint;

  /**
   * Calculate required tokens for the transaction
   * @param params - Contract parameters
   * @returns Required tokens array
   */
  protected abstract calculateRequiredTokens: (
    params: ErgoScriptParams,
  ) => Array<TokenAmount<bigint>>;
}
