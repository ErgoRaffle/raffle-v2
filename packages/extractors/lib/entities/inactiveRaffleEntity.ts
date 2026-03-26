import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import {
  Entity,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('inactive_raffle')
export class InactiveRaffleEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  serviceErgoTree: string;

  @Column({ type: 'varchar' })
  implementerErgoTree: string;

  @Column({ type: 'varchar' })
  projectErgoTree: string;

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

  @Column({ type: 'varchar', nullable: true })
  collectingTokenId?: string;
}
