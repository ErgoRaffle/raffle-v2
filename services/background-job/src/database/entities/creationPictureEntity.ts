import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CreationParamsEntity } from './creationParamsEntity';

@Entity('creation_params_picture')
export class CreationPictureEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer' })
  orderIndex: number;

  @Column({ type: 'varchar' })
  content: string;

  @ManyToOne(() => CreationParamsEntity, { onDelete: 'NO ACTION' })
  @JoinColumn()
  params: CreationParamsEntity;
}
