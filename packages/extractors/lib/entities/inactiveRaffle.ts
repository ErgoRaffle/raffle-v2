import { Entity, Column } from 'typeorm';
import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';
import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';

@Entity('inactive_raffle')
export class InactiveRaffle extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar', length: 255 })
  txId: string;

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
