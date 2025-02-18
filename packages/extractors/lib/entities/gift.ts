import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from 'typeorm';

@Entity('gifts')
export class Gift extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  donatorErgoTree: string;

  @Column({ type: 'integer' })
  winnerIndex: number;
}
