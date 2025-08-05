import { TxPot } from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';

import { Request, RequestWithId } from './types';
import { Network } from '@fleet-sdk/core';
import { DataProvider } from './dataProvider';
import { BoxSelector } from './boxSelector';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected requests = new Map<number, RequestWithId>();
  protected dataProvider: DataProvider;

  constructor(
    protected txPot: TxPot,
    nodeURL: string,
    protected networkType: Network,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {
    this.dataProvider = new DataProvider(txPot, nodeURL, logger);
  }

  /**
   * register a new lookup request and return its assigned ID
   * @param request
   * @returns {number}
   */
  readonly registerRequest = (request: Request) => {
    this.requests.set(++this.requestsIdCounter, {
      ...request,
      id: this.requestsIdCounter,
    });
    this.logger.info(
      `New BoxLookupRequest registered by ${this.requestsIdCounter} id`,
    );
    return this.requestsIdCounter;
  };

  /**
   * unregister request by related request-id if exists
   * @param requestId
   * @returns {Request | undefined}
   */
  readonly unregisterRequest = (requestId: number) => {
    if (this.requests.has(requestId)) {
      const request = this.requests.get(requestId);
      this.logger.info(`A BoxLookupRequest unregistered by ${requestId} id`);
      this.requests.delete(requestId);
      return request;
    }
    this.logger.info(
      `Tried to unregistered a BoxLookupRequest by ${requestId} id that not exists`,
    );
    return undefined;
  };

  /**
   * Serve requests by considering unspent-boxes
   * - For each request, it will select boxes that are related to the request
   * - If the selected boxes are covering the request, it will call the request.onSuffice method
   * - If the selected boxes are not covering the request, it will select more boxes
   * - It will continue until the request is covered or the unspent boxes are exhausted
   */
  public serveRequests = async () => {
    if (this.requests.size <= 0) return;
    await this.dataProvider.startNewRound();
    this.logger.info('The BoxLookup serving requests started');
    for (const request of this.requests.values()) {
      await this.dataProvider.updateRoundWithTxPotData();
      let boxSelector = new BoxSelector(this.logger, request, this.networkType);

      const roundState = this.dataProvider.getCurrentRoundState();
      const unspentBoxIds = new Set(
        roundState.unspentBoxes.map((box) => box.boxId),
      );
      // Filter out spent boxes and availble boxes in the round
      const unspentMinedBoxes = (await request.getMinedBoxes()).filter(
        (box) =>
          !roundState.spentBoxIds.has(box.boxId) &&
          !unspentBoxIds.has(box.boxId),
      );
      // Filter out boxes that are not related to the request
      const totalBoxes = [
        ...roundState.unspentBoxes,
        ...unspentMinedBoxes,
      ].filter((box) => boxSelector.isRelatedToRequest(box));

      for (const box of totalBoxes) {
        // Break the loop if the request is unregistered from the box lookup
        if (!this.requests.has(request.id)) break;
        boxSelector.addBox(box);

        if (boxSelector.isCovering()) {
          try {
            await request.onSuffice(
              boxSelector.getBoxes(),
              roundState.unspentBoxes,
              request.id,
            );
          } catch (error) {
            this.logger.error(
              `Error in onSuffice callback for [${request.address}] request address`,
              error,
            );
          }
          boxSelector = new BoxSelector(this.logger, request, this.networkType);
          this.logger.info(
            `The BoxLookup triggered for ${request.address} request address`,
          );
          this.logger.debug(
            `The ${request.address} request address sufficed by ${JSON.stringify(boxSelector.getBoxes())} boxes`,
          );
        }
      }
    }
    this.logger.info('The BoxLookup serving requests done');
  };
}
