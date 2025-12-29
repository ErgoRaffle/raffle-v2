import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from '@rosen-bridge/extended-typeorm';

import { RaffleDetailsEntity } from './raffleDetails';

@Entity('picture')
export class PictureEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'integer' })
  orderIndex: number;

  @Column({ type: 'varchar' })
  content: string;

  @ManyToOne(() => RaffleDetailsEntity, { onDelete: 'NO ACTION' })
  @JoinColumn()
  details: RaffleDetailsEntity;
}
