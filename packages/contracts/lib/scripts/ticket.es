{
  // ErgoRaffle V2 Ticket Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: [DonatorAddress]
  //   R5[Coll[Long]]: [RangeStart, RangeEnd, TicketPrice]
  // Tokens:
  //   0: Ticket
  //
  // Spent in 4 transactions:
  //   - Gift unwrap
  //      [Ticket, WinnerPrize, Gift] --> [Ticket, WinnerPrize, UserBox]
  //   - Winner Reward
  //      [Ticket, WinnerPrize] --> [Ticket, UserBox]
  //   - Ticket redeem
  //      [TicketRedeem, Ticket] --> [TicketRedeem, UserBox]
  //   - Owner ticket collection with TicketCollectorNFT
  //
  sigmaProp(true)
}
