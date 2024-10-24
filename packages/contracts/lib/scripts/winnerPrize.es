{
  // ErgoRaffle V2 WinnerPrize Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnerTicketIndex, GiftCount, TxFee]
  //   R5[Int]: WinnerIndex
  //   R6[Long]: UnwrappedGiftCount
  // Tokens:
  //   0: Ticket
  //   1: GiftToken
  //   2: CollectingToken (if token-goal raffle)
  //
  // Spent in 2 transactions:
  //   - Gift unwrap
  //      [WinnerPrize, Gift] + [(DataInput)Ticket] --> [WinnerPrize, UserBox]
  //   - Winner Reward
  //      [WinnerPrize] + [(DataInput)Ticket] --> [UserBox]
  //
  sigmaProp(true)
}
