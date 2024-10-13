{
  // ErgoRaffle V2 WinnerPrize Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnerTicketIndex, WinnerIndex, GiftCount, TxFee]
  //   R5[Long]: UnwrappedGiftCount
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
