import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';
import { CreationPictureEntity } from './creationPictureEntity';

@Entity('creation_params')
export class CreationParamsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @OneToMany(() => CreationPictureEntity, (picture) => picture.params)
  pictures: CreationPictureEntity[];

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

  @Column('integer')
  winnersPercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  ticketPrice: bigint;

  @Column({ type: 'varchar', nullable: true })
  collectingTokenId?: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  goal: bigint;

  @Column('integer')
  deadline: number;

  @Column('integer')
  winnerCount: number;

  /**
   * This field stores the percentage of winners as a string
   * @example
   * // stored percentages of five raffle-v2 winners:
   * "400,300,100,100,100"
   */
  @Column({ type: 'varchar' })
  winnersPercentList: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  requiredValue: bigint;

  @Column({ type: 'varchar', nullable: true })
  requiredTokenId?: string;

  @Column({ type: 'varchar' })
  proxyAddress: string;

  @Column({ type: 'integer' })
  timestamp: number;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;
}
