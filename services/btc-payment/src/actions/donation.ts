import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';

import { InactiveRaffleEntity } from '@ergo-raffle/extractors';
import {
  DonationParamsEntity,
  DonationStatus,
} from '@ergo-raffle/request-params';

class DonationAction {
  protected repository: Repository<DonationParamsEntity>;
  protected raffleRepository: Repository<InactiveRaffleEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(DonationParamsEntity);
    this.raffleRepository = dataSource.getRepository(InactiveRaffleEntity);
  }

  /**
   * Get the last donation params id
   * @returns The last donation params id
   */
  getLastId = async (): Promise<number> => {
    const data = await this.repository.findOne({
      where: {},
      order: { id: 'DESC' },
    });
    return data?.id || 0;
  };

  /**
   * Save the donation params
   * @param donationParams - The donation params (raffleId, ticketCount, donatorAddress, bitcoinAddress)
   * @param tokenAmount - Total donation token amount
   * @param tokenId - Bitcoin chain token id for the raffle collecting token
   * @returns The saved donation params
   */
  save = async (
    donationParams: Omit<
      DonationParamsEntity,
      | 'id'
      | 'timestamp'
      | 'tokenId'
      | 'tokenAmount'
      | 'requiredValue'
      | 'status'
    >,
    tokenAmount: bigint,
    tokenId: string,
  ): Promise<DonationParamsEntity> => {
    const savedParams = await this.repository.insert({
      ...donationParams,
      tokenId,
      tokenAmount,
      timestamp: Date.now() / 1000,
      status: DonationStatus.Pending,
    });

    const generatedId = savedParams.identifiers[0].id;

    const savedEntity = await this.repository.findOne({
      where: { id: generatedId },
    });

    if (!savedEntity) {
      throw new Error('Failed to retrieve saved donation params');
    }

    return savedEntity;
  };

  /**
   * Get all ongoing (pending) donation requests.
   * @returns The ongoing donation requests
   */
  getOngoing = async (): Promise<DonationParamsEntity[]> => {
    return this.repository.find({
      where: { status: DonationStatus.Pending },
      order: { id: 'ASC' },
    });
  };

  /**
   * Update donation request status.
   * @param id - The donation request id
   * @param status - The new status
   * @param donationTxId - The donation transaction id
   * @returns The updated donation request
   */
  updateStatus = async (
    id: number,
    status: DonationStatus,
    donationTxId?: string,
  ): Promise<void> => {
    await this.repository.update({ id }, { status, donationTxId });
  };
}

export default DonationAction;
