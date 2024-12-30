import { DataSource } from "typeorm"
import "reflect-metadata"
import {
    Raffle,
    RaffleService,
    Gift,
    GiftRedeem,
    RaffleDetails,
    SafePay,
    RawBoxEntities,
    SuccessRaffle,
    Ticket,
    TicketRedeem,
    Winner,
    WinnerPrize
} from '.';


const AppDataSource = new DataSource({
    "type": "sqlite",
    "database": "raffle.sqlite3",
    "migrationsTableName": "migrations",
    "synchronize": false,
    "logging": false,
    "entities": [
        Raffle,
        RaffleService,
        Gift,
        GiftRedeem,
        RaffleDetails,
        SafePay,
        RawBoxEntities,
        SuccessRaffle,
        Ticket,
        TicketRedeem,
        Winner,
        WinnerPrize
    ],
});

export {
    AppDataSource
};
