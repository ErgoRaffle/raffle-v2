import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity()
export class RaffleService {
  @PrimaryColumn()
  boxId: string;

  @Column()
  extractorName: string;

  @Column()
  boxSerialized: string;

  @Column({ type: 'bigint' })
  height: string;

  @Column()
  block: string;

  @Column()
  txId: string;

  @Column({ nullable: true, type: 'bigint' })
  spendHeight: string;

  @Column({ nullable: true, type: 'text' })
  spendBlock: string | null;

  @Column()
  serviceFeePercent: number;

  @Column()
  implementerFeePercent: number;

  @Column({ type: 'bigint' })
  creationFee: string;
}
