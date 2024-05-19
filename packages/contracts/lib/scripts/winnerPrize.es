{
  // ErgoRaffle V2 WinnerPrize Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnerTicketIndex, WinnerIndex, GiftCount]
  //   R5[Long]: UnwrappedGiftCount
  // Tokens:
  //   0: Ticket
  //   1: CollectingToken (if token-goal raffle)
  //
  // Spent in 2 transactions:
  //   - Gift unwrap
  //      [Ticket, WinnerPrize, Gift] --> [Ticket, WinnerPrize, UserBox]
  //   - Winner Reward
  //      [Ticket, WinnerPrize] --> [Ticket, UserBox]
  //
  sigmaProp(true)
}
