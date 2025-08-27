import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('donation_params')
export class DonationParamsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'integer' })
  ticketCount: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  requiredValue: bigint;

  @Column({ type: 'varchar', nullable: true })
  collectingTokenId?: string;

  @Column({
    type: 'bigint',
    transformer: new BigIntValueTransformer(),
    nullable: true,
  })
  collectingTokenAmount?: bigint;

  @Column({ type: 'varchar' })
  donatorAddress: string;

  @Column({ type: 'varchar' })
  proxyAddress: string;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'integer' })
  timestamp: number;
}
