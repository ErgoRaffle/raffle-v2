import { AbstractErgoEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from '@rosen-bridge/extended-typeorm';

@Entity('dynamic_box')
export class DynamicBoxEntity extends AbstractErgoEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar' })
  tokenId: string;

  @Column({ type: 'varchar' })
  amount: string;
}
