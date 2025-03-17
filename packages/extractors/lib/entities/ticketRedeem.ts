import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { BigIntValueTransformer } from '@rosen-bridge/extended-typeorm';
import { Entity, Column } from 'typeorm';

@Entity('ticket_redeem')
export class TicketRedeemEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  totalSoldTicket: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  redeemedTickets: bigint;
}
