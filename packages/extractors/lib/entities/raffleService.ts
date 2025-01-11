import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';

import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class RaffleService {
  @PrimaryColumn('text')
  boxId: string;

  @Column('text')
  extractor: string;

  @Column('text')
  boxSerialized: string;

  @Column({ type: 'integer' })
  height: string;

  @Column('text')
  block: string;

  @Column('text')
  txId: string;

  @Column({ nullable: true, type: 'integer' })
  spendHeight: string;

  @Column({ nullable: true, type: 'text' })
  spendBlock: string | null;

  @Column('integer')
  serviceFeePercent: number;

  @Column('integer')
  implementerFeePercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  creationFee: bigint;
}
