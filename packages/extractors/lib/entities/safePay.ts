import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from '@rosen-bridge/extended-typeorm';

@Entity('safe_pay')
export class SafePayEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  recipient: string;
}
