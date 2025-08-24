import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from '@rosen-bridge/extended-typeorm';

@Entity('gift_redeem')
export class GiftRedeemEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'integer' })
  step: number;
}
