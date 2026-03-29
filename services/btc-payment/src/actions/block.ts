import { BlockEntity } from '@rosen-bridge/abstract-scanner';
import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

class BlockAction {
  protected repository: Repository<BlockEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(BlockEntity);
  }

  /**
   * Get the latest stored block height for a scanner.
   * @param scanner - Scanner name (e.g. BITCOIN_SCANNER_NAME)
   * @returns The latest height, or null if no blocks stored yet
   */
  getLatestHeight = async (scanner: string): Promise<number | null> => {
    const block = await this.repository.findOne({
      where: { scanner },
      order: { height: 'DESC' },
    });
    return block?.height ?? null;
  };
}

export default BlockAction;
