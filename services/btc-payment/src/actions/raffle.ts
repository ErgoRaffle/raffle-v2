import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

import { InactiveRaffleEntity } from '@ergo-raffle/extractors';

class RaffleAction {
  protected repository: Repository<InactiveRaffleEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(InactiveRaffleEntity);
  }

  /**
   * Get the raffle entity by raffle id
   * @param raffleId - The raffle id
   * @returns The raffle entity
   */
  getData = (raffleId: string): Promise<InactiveRaffleEntity | null> => {
    return this.repository.findOne({
      where: {
        raffleId: raffleId,
      },
    });
  };
}

export default RaffleAction;
