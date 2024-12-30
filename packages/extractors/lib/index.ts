export { Raffle } from './entities/raffle';
export { RaffleService } from "./entities/raffleService";
export { Gift } from './entities/gift';
export { GiftRedeem } from "./entities/giftRedeem";
export { RaffleDetails } from './entities/raffleDetails';
export { SafePay } from "./entities/safePay";
export { RawBoxEntities } from "./entities/rawBoxEntities";
export { SuccessRaffle } from './entities/successRaffle';
export { Ticket } from "./entities/ticket";
export { TicketRedeem } from './entities/ticketRedeem';
export { Winner } from "./entities/winner";
export { WinnerPrize } from './entities/winnerPrize';

import { AppDataSource } from "./data-source.js"

AppDataSource.initialize().then(async () => {
    console.log("Inserting a new user into the database...")
}).catch(error => console.log(error))
