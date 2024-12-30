import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class RaffleDetails {
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
    name: string

    @Column()
    description: string
}



@Entity()
export class Pictures {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    raffleId: string

    @Column()
    orderIndex: number

    @Column()
    path: number
}