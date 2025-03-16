import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from 'typeorm';

@Entity('safe_pay')
export class SafePayEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  txType: string;
}
