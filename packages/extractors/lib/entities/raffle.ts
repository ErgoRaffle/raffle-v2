import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class Raffle {  // inactiveRaffle
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
    serviceErgoTree: string

    @Column()
    implementerErgoTree: string

    @Column()
    creatorErgoTree: number

    @Column()
    winnersPercent: number

    @Column()
    serviceFeePercent: number

    @Column()
    ticketPrice: number
    
    @Column()
    goal: bigint
    
    @Column()
    deadline: bigint

    @Column()
    winnersPercentList: string

    @Column()
    ticketId: string

    @Column()
    txFee: bigint
}
