import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';
import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';

import { Entity, Column } from 'typeorm';

@Entity()
export class RaffleService extends AbstractErgoExtractorEntity {
  @Column('text')
  txId: string;

  @Column('integer')
  serviceFeePercent: number;

  @Column('integer')
  implementerFeePercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  creationFee: bigint;
}
