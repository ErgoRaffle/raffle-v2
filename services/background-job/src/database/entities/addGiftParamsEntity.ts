import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from '@rosen-bridge/extended-typeorm';

@Entity('add_gift_params')
export class AddGiftParamsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'integer' })
  winnerIndex: number;

  @Column({ type: 'varchar' })
  proxyAddress: string;

  @Column({ type: 'varchar' })
  giftGiverAddress: string;

  @Column({ type: 'varchar' })
  status: string;

  @Column({ type: 'integer' })
  timestamp: number;
}
