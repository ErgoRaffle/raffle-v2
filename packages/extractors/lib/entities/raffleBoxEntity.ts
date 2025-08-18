import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from '@rosen-bridge/extended-typeorm';

/**
 * This entity will save TicketRepo, GiftTokenRepo, ActiveRaffle boxes
 */
export enum RaffleBoxType {
  TicketRepo = 'ticket_repo',
  GiftTokenRepo = 'gift_token_repo',
  ActiveRaffle = 'active_raffle',
}

@Entity('raffle_box')
export class RaffleBoxEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'simple-enum', enum: RaffleBoxType })
  type: RaffleBoxType;
}
