import { Entity, PrimaryColumn } from '@rosen-bridge/extended-typeorm';

@Entity('tag')
export class TagEntity {
  @PrimaryColumn({ type: 'varchar' })
  title: string;
}
