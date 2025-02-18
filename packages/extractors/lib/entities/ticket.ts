import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';
import { Entity, Column } from 'typeorm';

@Entity('tickets')
export class Ticket extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  donatorErgoTree: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  rangeStart: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  rangeEnd: bigint;
}
