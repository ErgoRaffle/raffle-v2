import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class GiftRedeem {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    boxId: string

    @Column()
    block: string

    @Column()
    height: number

    @Column()
    txId: string

    @Column()
    spendBlock: string

    @Column()
    spendHeight: number
    
    @Column()
    raffleId: string
    
    @Column()
    boxSerialized: string

    @Column()
    extractorName: string

    @Column()
    step: number
}
