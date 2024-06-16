{
  // ErgoRaffle V2 Ticket Repo Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: tokenName
  //   R5[Coll[Byte]]: tokenDescription
  //   R6[Coll[Byte]]: Decimals (0)
  // Tokens:
  //   0: Ticket
  //
  // Spent in 1 transaction:
  //   - Active raffle creation
  //      [InactiveRaffle, TicketRepo] --> [ActiveRaffle, RaffleDetails, Winner[]]
  //
  sigmaProp(true)
}
