import { Column, Entity, PrimaryColumn } from '@rosen-bridge/extended-typeorm';

@Entity('token')
export class TokenEntity {
  @PrimaryColumn({ type: 'varchar' })
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'integer' })
  decimals: number;

  @Column({ type: 'boolean' })
  isVerified: boolean;
}
