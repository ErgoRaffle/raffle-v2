{
  // ErgoRaffle V2 Ticket Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: [DonatorAddressHash]
  //   R5[Coll[Long]]: [RangeStart, RangeEnd, TicketPrice]
  // Tokens:
  //   0: Ticket
  //
  // Spent in 2 transactions:
  //   - Ticket redeem
  //      [TicketRedeem, Ticket] --> [TicketRedeem, UserBox]
  //   - Owner ticket collection with TicketCollectorNFT
  //      [TicketCollector, Ticket] --> [TicketCollector]
  //
  // Involved in 2 transactions as data input:
  //   - Gift unwrap
  //      [WinnerPrize, Gift] + [(DataInput)Ticket] --> [WinnerPrize, UserBox]
  //   - Winner Reward
  //      [WinnerPrize] + [(DataInput)Ticket] --> [UserBox]
  //
  sigmaProp(true)
}
