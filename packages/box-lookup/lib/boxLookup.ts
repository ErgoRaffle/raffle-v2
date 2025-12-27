import { TxPot } from '@rosen-bridge/tx-pot';
import { AbstractLogger, DummyLogger } from '@rosen-bridge/abstract-logger';
import JsonBigInt from '@rosen-bridge/json-bigint';

import { Request } from './types';
import { DataProvider } from './dataProvider';
import { DeserializeTx } from './types';
import { BoxSelector } from './boxSelector';

export class BoxLookup {
  protected requestsIdCounter: number = 0;
  protected requests: Map<number, Request> = new Map();
  protected dataProvider: DataProvider;

  constructor(
    protected txPot: TxPot,
    nodeURL: string,
    deserializeTx: DeserializeTx,
    protected logger: AbstractLogger = new DummyLogger(),
  ) {
    this.dataProvider = new DataProvider(txPot, nodeURL, deserializeTx, logger);
  }

  /**
   * register a new lookup request and return its assigned ID
   * @param request
   * @returns {number}
   */
  readonly registerRequest = (request: Request) => {
    this.requests.set(++this.requestsIdCounter, request);
    this.logger.info(
      `Registered new box lookup request with id ${this.requestsIdCounter}`,
    );
    this.logger.debug(
      `Request ${this.requestsIdCounter}: ${JsonBigInt.stringify(request)}`,
    );
    return this.requestsIdCounter;
  };

  /**
   * unregister request by related request-id if exists
   * @param requestId
   * @returns {Request | undefined}
   */
  readonly unregisterRequest = (requestId: number) => {
    const request = this.requests.get(requestId);
    if (request) {
      this.logger.info(
        `Successfully unregistered box lookup request with id ${requestId}`,
      );
      this.requests.delete(requestId);
      return request;
    }
    this.logger.warn(
      `Attempted to unregister box lookup request with id ${requestId}, but no such request was found`,
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
    this.logger.info(
      `Starting to serve ${this.requests.size} box lookup request(s)`,
    );
    for (const [requestId, request] of this.requests.entries()) {
      this.logger.debug(
        `Serving request ${requestId} on ergoTree ${request.ergoTree}`,
      );
      await this.dataProvider.updateRoundWithTxPotData();
      let boxSelector = new BoxSelector(this.logger, request);

      const roundState = this.dataProvider.getCurrentRoundState();
      const unspentBoxIds = new Set(
        roundState.unspentBoxes.map((box) => box.boxId),
      );
      // Filter out spent boxes and available boxes in the round
      const unspentMinedBoxes = (await request.getConfirmedBoxes()).filter(
        (box) =>
          !roundState.spentBoxIds.has(box.boxId) &&
          !unspentBoxIds.has(box.boxId),
      );
      this.logger.debug(
        `Request ${requestId}: Found ${unspentMinedBoxes.length} new confirmed unspent box(es): [${unspentMinedBoxes.map((box) => box.boxId).join(', ')}]`,
      );
      // Filter out boxes that are not related to the request
      const totalBoxes = [
        ...roundState.unspentBoxes,
        ...unspentMinedBoxes,
      ].filter((box) => boxSelector.isEligibleForSelection(box));

      this.logger.debug(
        `Request ${requestId}: Total of ${totalBoxes.length} related box(es) found`,
      );
      for (const box of totalBoxes) {
        // Break the loop if the request is unregistered from the box lookup
        if (!this.requests.has(requestId)) break;
        boxSelector.addBox(box);

        if (boxSelector.isCovering()) {
          this.logger.info(
            `Request ${requestId}: Request satisfied with boxes: ${boxSelector
              .getBoxes()
              .map((box) => box.boxId)
              .join(', ')} calling onSuffice`,
          );
          try {
            await request.onSuffice(
              boxSelector.getBoxes(),
              this.dataProvider.getCurrentRoundState().unspentBoxes,
              requestId,
            );
            await this.dataProvider.updateRoundWithTxPotData();
          } catch (error) {
            this.logger.error(
              `Request ${requestId}: Error occurred while processing 'onSuffice' callback: ${error}`,
            );
          }
          this.logger.debug(
            `Request ${requestId}: Resetting box selector after onSuffice callback`,
          );
          boxSelector = new BoxSelector(this.logger, request);
        }
      }
    }
    this.logger.info('Completed serving all box lookup requests');
  };
}
