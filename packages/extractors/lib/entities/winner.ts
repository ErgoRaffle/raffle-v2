import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from '@rosen-bridge/extended-typeorm';

@Entity('winner')
export class WinnerEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column('integer')
  index: number;

  @Column('integer')
  rewardPercent: number;
}
