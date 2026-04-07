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
  getData = async (raffleId: string): Promise<InactiveRaffleEntity> => {
    const raffle = await this.repository.findOne({
      where: {
        raffleId: raffleId,
      },
    });
    if (!raffle) {
      throw new Error(`Raffle with id ${raffleId} not found`);
    }
    return raffle;
  };
}

export default RaffleAction;
