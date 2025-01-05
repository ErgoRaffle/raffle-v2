import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class RaffleService {
  @PrimaryColumn()
  boxId: string;

  @Column()
  block: string;

  @Column()
  height: number;

  @Column()
  txId: string;

  @Column({ nullable: true, type: 'text' })
  spendBlock: string | null;

  @Column({ nullable: true })
  spendHeight: number;

  @Column()
  boxSerialized: string;

  @Column()
  extractorName: string;

  @Column({ type: 'bigint' })
  serviceFeePercent: string;

  @Column({ type: 'bigint' })
  implementerFeePercent: string;

  @Column({ type: 'bigint' })
  creationFee: string;
}
