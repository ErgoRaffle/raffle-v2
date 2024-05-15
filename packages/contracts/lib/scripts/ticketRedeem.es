{
  // ErgoRaffle V2 Ticket Redeem Contract
  //
  // Registers:
  // Registers:
  //   R4[Coll[Long]]: [TotalSoldTicket, TicketPrice, txFee]
  //   R5[Coll[Long]]: [RedeemedTickets]
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  //
  // Spent in 2 transactions:
  //   - Ticket redeem
  //      [TicketRedeem, Ticket] --> [TicketRedeem, UserBox]
  //   - License redeem
  //      [Service, TicketRedeem] --> [Service, ServiceFee]
  // 
  sigmaProp(true)
}
