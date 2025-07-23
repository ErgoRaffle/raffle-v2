import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from 'typeorm';

/**
 * This entity will save TicketRepo, GiftTokenRepo, ActiveRaffle boxes
 */
@Entity('raffle_box')
export class RaffleBoxEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  ergoTree: string;
}
