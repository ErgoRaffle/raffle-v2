import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RaffleDetailsEntity } from './raffleDetails';

@Entity('pictures')
export class PictureEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'integer' })
  orderIndex: number;

  @Column({ type: 'varchar' })
  content: string;

  @ManyToOne(() => RaffleDetailsEntity, { onDelete: 'CASCADE' })
  @JoinColumn()
  details: RaffleDetailsEntity;
}
