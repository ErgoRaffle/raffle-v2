import { ErgoAddress, Network } from '@fleet-sdk/core';
import { ProxyGenerationResult, ErgoScriptParams } from '../types';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Abstract base class for all proxy generators
 * Provides common functionality for ErgoScript contract parameter filling and address generation
 */
export abstract class BaseProxyGenerator {
  protected readonly networkType: Network;
  protected readonly scriptsDir: string;

  constructor(networkType: Network = Network.Mainnet) {
    this.networkType = networkType;
    this.scriptsDir = join(__dirname, '../scripts');
  }

  /**
   * Load ErgoScript contract from scripts directory
   * @param scriptName - Name of the script file (without .es extension)
   * @returns ErgoScript contract content
   */
  protected loadScript(scriptName: string): string {
    try {
      const scriptPath = join(this.scriptsDir, `${scriptName}.es`);
      return readFileSync(scriptPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to load script ${scriptName}.es: ${error}`);
    }
  }

  /**
   * Generate proxy address and ErgoTree from ErgoScript contract
   * @param contractScript - The ErgoScript contract as string
   * @param params - Parameters to fill in the contract
   * @returns ProxyGenerationResult with address and ErgoTree
   */
  protected generateProxyFromScript(
    contractScript: string,
    params: ErgoScriptParams,
  ): ProxyGenerationResult {
    // TODO: Implement ErgoScript parameter filling and compilation
    // This is where you'll implement the actual ErgoScript processing

    const filledScript = this.fillContractParameters(contractScript, params);
    const ergoTree = this.compileErgoScript(filledScript);
    const proxyAddress = this.ergoTreeToAddress(ergoTree);

    return {
      proxyAddress,
      ergoTree,
      requiredNanoErgs: this.calculateRequiredNanoErgs(params),
      requiredTokens: this.calculateRequiredTokens(params),
    };
  }

  /**
   * Fill contract parameters into ErgoScript template
   * @param script - ErgoScript template
   * @param params - Parameters to fill
   * @returns Filled ErgoScript
   */
  protected abstract fillContractParameters(
    script: string,
    params: ErgoScriptParams,
  ): string;

  /**
   * Compile ErgoScript to ErgoTree
   * @param script - Filled ErgoScript
   * @returns ErgoTree hash
   */
  protected abstract compileErgoScript(script: string): string;

  /**
   * Convert ErgoTree to ErgoAddress
   * @param ergoTree - ErgoTree hash
   * @returns ErgoAddress string
   */
  protected ergoTreeToAddress(ergoTree: string): string {
    return ErgoAddress.fromErgoTree(ergoTree, this.networkType).toString();
  }

  /**
   * Calculate required nano ERGs for the transaction
   * @param params - Contract parameters
   * @returns Required nano ERGs
   */
  protected abstract calculateRequiredNanoErgs(
    params: ErgoScriptParams,
  ): bigint;

  /**
   * Calculate required tokens for the transaction
   * @param params - Contract parameters
   * @returns Required tokens array
   */
  protected abstract calculateRequiredTokens(
    params: ErgoScriptParams,
  ): Array<{ tokenId: string; amount: bigint }> | undefined;

  /**
   * Validate parameters before generation
   * @param params - Parameters to validate
   * @throws Error if validation fails
   */
  protected abstract validateParams(params: ErgoScriptParams): void;
}
