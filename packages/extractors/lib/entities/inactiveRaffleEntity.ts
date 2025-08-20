import {
  Entity,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';
import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';

@Entity('inactive_raffle')
export class InactiveRaffleEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  serviceErgoTree: string;

  @Column({ type: 'varchar' })
  implementorErgoTree: string;

  @Column({ type: 'varchar' })
  creatorErgoTree: string;

  @Column('integer')
  serviceFeePercent: number;

  @Column('integer')
  implementerFeePercent: number;

  @Column('integer')
  winnersPercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  ticketPrice: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  goal: bigint;

  @Column('integer')
  deadline: number;

  /**
   * This field stores the percentage of winners as a string
   * @example
   * // stored percentages of five raffle-v2 winners:
   * "400,300,100,100,100"
   */
  @Column({ type: 'varchar' })
  winnersPercentList: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  txFee: bigint;
}
