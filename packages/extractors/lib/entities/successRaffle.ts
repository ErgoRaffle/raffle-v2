import { AbstractErgoExtractorEntity } from '@rosen-bridge/abstract-extractor';
import { Entity, Column } from '@rosen-bridge/extended-typeorm';

@Entity('success_raffle')
export class SuccessRaffleEntity extends AbstractErgoExtractorEntity {
  @Column('varchar')
  txId: string;

  @Column('varchar')
  raffleId: string;

  @Column('varchar')
  selectedWinnersList: string;

  @Column('integer')
  step: number;
}
