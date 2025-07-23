import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';

@Entity('creation_request')
export class CreationRequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'varchar' })
  serviceAddress: string;

  @Column({ type: 'varchar' })
  implementorAddress: string;

  @Column({ type: 'varchar' })
  creatorAddress: string;

  @Column('integer')
  serviceFeePercent: number;

  @Column('integer')
  implementerFeePercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  winnersPercent: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  ticketPrice: bigint;

  @Column({ type: 'varchar', nullable: true })
  collectingTokenId?: string;

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

  @Column({ type: 'varchar' })
  proxyAddress: string;

  @Column({ type: 'integer' })
  timestamp: number;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;
}
