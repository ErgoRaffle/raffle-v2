import { BlockEntity, PROCEED } from '@rosen-bridge/abstract-scanner';
import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

class BlockAction {
  protected repository: Repository<BlockEntity>;
  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(BlockEntity);
  }

  getLastScannedHeight = async () => {
    const lastBlock = await this.repository.findOne({
      where: {
        status: PROCEED,
      },
      order: {
        height: 'desc',
      },
    });
    return lastBlock?.height || 0;
  };
}

export default BlockAction;
