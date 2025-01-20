import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';

import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class RaffleService {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  boxId: string;

  @Column({ type: 'varchar', length: 255 })
  extractor: string;

  @Column('text')
  boxSerialized: string;

  @Column({ type: 'integer' })
  height: number;

  @Column('text')
  block: string;

  @Column('text')
  txId: string;

  @Column({ nullable: true, type: 'integer' })
  spendHeight: number | null;

  @Column({ nullable: true, type: 'text' })
  spendBlock: string | null;

  @Column('integer')
  serviceFeePercent: number;

  @Column('integer')
  implementerFeePercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  creationFee: bigint;
}
