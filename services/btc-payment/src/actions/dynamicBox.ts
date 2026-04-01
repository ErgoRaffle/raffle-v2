import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import {
  DataSource,
  LessThanOrEqual,
  Repository,
} from '@rosen-bridge/extended-typeorm';

import { DynamicBoxEntity } from '@ergo-raffle/dynamic-extractor';

class DynamicBoxAction {
  protected repository: Repository<DynamicBoxEntity>;

  constructor(
    dataSource: DataSource,
    private logger: AbstractLogger,
  ) {
    this.repository = dataSource.getRepository(DynamicBoxEntity);
  }

  /**
   * Get the sum of confirmed dynamic box amounts for an address and token.
   * Only includes boxes at or below maxHeightInclusive (i.e. confirmed enough).
   * @param address - Bitcoin address
   * @param tokenId - Token id (e.g. rune id or 'btc')
   * @param maxHeightInclusive - Maximum block height to include (typically latestHeight - requiredConfirmations)
   * @returns The sum of confirmed dynamic box amounts
   */
  getConfirmedSum = async (
    address: string,
    tokenId: string,
    maxHeightInclusive: number,
  ): Promise<bigint> => {
    const boxes = await this.repository.find({
      where: {
        address,
        tokenId,
        height: LessThanOrEqual(maxHeightInclusive),
      },
    });
    this.logger.info(
      `Found ${boxes.length} confirmed dynamic boxes for address=${address}, tokenId=${tokenId}, maxHeightInclusive=${maxHeightInclusive}`,
    );
    this.logger.debug(
      `Confirmed dynamic boxes: ${boxes.map((box) => `boxId=${box.identifier}, amount=${box.amount}`).join(', ')}`,
    );
    return boxes.reduce((sum, box) => sum + BigInt(box.amount), BigInt(0));
  };
}

export default DynamicBoxAction;
