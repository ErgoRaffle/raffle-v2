import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

export enum DonationStatus {
  Pending = 'pending',
  Completed = 'completed',
  Timedout = 'timedout',
}

@Entity('donation_params')
export class DonationParamsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'integer' })
  ticketCount: number;

  @Column({ type: 'varchar' })
  tokenId?: string;

  @Column({
    type: 'bigint',
    transformer: new BigIntValueTransformer(),
  })
  tokenAmount?: bigint;

  @Column({ type: 'varchar' })
  donatorAddress: string;

  @Column({ type: 'varchar' })
  bitcoinAddress: string;

  @Column({ type: 'integer' })
  timestamp: number;

  @Column({ type: 'simple-enum', enum: DonationStatus })
  status: DonationStatus;
}
