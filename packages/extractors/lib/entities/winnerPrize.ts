import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from '@rosen-bridge/extended-typeorm';

@Entity('winner_prize')
export class WinnerPrizeEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  winnerTicketIndex: number;

  @Column({ type: 'integer' })
  giftCount: number;

  @Column({ type: 'integer' })
  winnerIndex: number;

  @Column({ type: 'integer' })
  unwrappedGiftCount: number;
}
