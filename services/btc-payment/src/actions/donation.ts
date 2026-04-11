import { DataSource, Repository } from '@rosen-bridge/extended-typeorm';
import { TokenMap } from '@rosen-bridge/tokens';
import { BITCOIN_CHAIN_NAME } from 'src/constants';

import { InactiveRaffleEntity } from '@ergo-raffle/extractors';
import {
  DonationParamsEntity,
  DonationStatus,
} from '@ergo-raffle/request-params';
import { ERG_TOKEN_ID } from '@ergo-raffle/utils';

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
      order: { id: 'DESC' },
    });
    return data?.id || 0;
  };

  /**
   * Save the donation params
   * @param donationParams - The donation params
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
    tokenMap: TokenMap,
  ): Promise<DonationParamsEntity> => {
    const raffleData = await this.raffleRepository.findOne({
      where: { raffleId: donationParams.raffleId },
    });
    if (!raffleData) {
      throw new Error('Raffle not found');
    }
    // TODO: Consider a fee for the transaction fees
    const donationAmount =
      BigInt(donationParams.ticketCount) * raffleData.ticketPrice;

    const token = tokenMap.getTokenSet(
      raffleData.collectingTokenId || ERG_TOKEN_ID,
    );
    if (!token) {
      throw new Error(
        `Token ${raffleData.collectingTokenId || ERG_TOKEN_ID} not found in token map`,
      );
    }
    if (!token[BITCOIN_CHAIN_NAME]) {
      throw new Error(
        `Bitcoin token id not found for token ${raffleData.collectingTokenId || ERG_TOKEN_ID}`,
      );
    }
    const savedParams = await this.repository.insert({
      ...donationParams,
      tokenId: token[BITCOIN_CHAIN_NAME].tokenId,
      tokenAmount: donationAmount,
      timestamp: Date.now(),
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
