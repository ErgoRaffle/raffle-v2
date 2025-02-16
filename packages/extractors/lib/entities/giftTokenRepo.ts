import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from 'typeorm';

@Entity('gift_token_repo')
export class GiftTokenRepo extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;
}
