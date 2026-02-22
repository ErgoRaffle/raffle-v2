import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import {
  Entity,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('ticket')
export class TicketEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  donatorErgoTree: string;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  rangeStart: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  rangeEnd: bigint;
}
