import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import {
  Entity,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('add_gift_proxy')
export class AddGiftProxyEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'integer' })
  expirationHeight: number;

  @Column({ type: 'integer' })
  raffleDeadline: number;

  @Column({ type: 'integer' })
  winnerIndex: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  txFee: bigint;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  giftGiverErgoTree: string;
}
