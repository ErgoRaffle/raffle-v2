import { BlockEntity } from '@rosen-bridge/abstract-scanner';
import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

class BlockAction {
  protected repository: Repository<BlockEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(BlockEntity);
  }

  /**
   * Get the latest stored block for a scanner.
   * @param scanner - Scanner name (e.g. BITCOIN_SCANNER_NAME)
   * @returns The latest block, or null if no blocks stored yet
   */
  getLatest = async (scanner: string): Promise<BlockEntity | null> => {
    const block = await this.repository.findOne({
      where: { scanner },
      order: { height: 'DESC' },
    });
    return block ?? null;
  };
}

export default BlockAction;
