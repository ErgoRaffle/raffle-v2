import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import {
  Entity,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('creation_proxy')
export class CreationProxyEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'integer' })
  expirationHeight: number;

  @Column({ type: 'integer' })
  raffleDeadline: number;

  @Column({ type: 'integer' })
  winnersPercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  ticketPrice: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  goal: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  txFee: bigint;

  @Column({ type: 'varchar' })
  implementerErgoTree: string;

  @Column({ type: 'varchar' })
  organizerErgoTree: string;

  @Column({ type: 'varchar' })
  projectErgoTree: string;

  @Column({ type: 'varchar' })
  winnersPercentList: string;

  @Column({ type: 'varchar' })
  collectingTokenId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'varchar' })
  tags: string;

  @Column({ type: 'text' })
  pictures: string;

  @Column({ type: 'integer' })
  winnerCount: number;
}
