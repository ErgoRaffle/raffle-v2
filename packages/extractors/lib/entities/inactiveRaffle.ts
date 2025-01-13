import { Entity, PrimaryColumn, Column } from 'typeorm';
import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';

@Entity()
export class InactiveRaffle {
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
  spendHeight: number;

  @Column({ nullable: true, type: 'text' })
  spendBlock: string | null;

  @Column('text')
  serviceErgoTree: string;

  @Column('text')
  implementorErgoTree: string;

  @Column('text')
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

  @Column('text')
  winnersPercentList: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  txFee: bigint;
}
