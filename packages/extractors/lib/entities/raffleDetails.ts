import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('raffle_details')
export class RaffleDetailsEntity extends AbstractErgoExtractorEntity {
  @Column({ type: 'varchar' })
  txId: string;

  @Column({ type: 'varchar' })
  raffleId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  description: string;
}

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
  @JoinColumn({ name: 'raffleId' })
  details: RaffleDetailsEntity;
}
