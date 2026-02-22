import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import {
  Entity,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('ticket_redeem')
export class TicketRedeemEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  totalSoldTicket: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  redeemedTickets: bigint;
}
