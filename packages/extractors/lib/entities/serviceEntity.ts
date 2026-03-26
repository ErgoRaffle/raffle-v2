import { AbstractErgoBoxEntity } from '@rosen-bridge/abstract-extractor';
import {
  Entity,
  Column,
  BigIntValueTransformer,
} from '@rosen-bridge/extended-typeorm';

@Entity('service')
export class ServiceEntity extends AbstractErgoBoxEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column('integer')
  serviceFeePercent: number;

  @Column('integer')
  implementerFeePercent: number;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  creationFee: bigint;

  @Column({ type: 'bigint', transformer: new BigIntValueTransformer() })
  txFee: bigint;
}
