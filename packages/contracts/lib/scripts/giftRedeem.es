{
  // ErgoRaffle V2 Gift Redeem Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [TotalSoldTicket, TicketPrice, txFee]
  //   R5[Coll[Int]]: [WinnersCount, Step]
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  //
  // Spent in 2 transactions:
  //   - Winner box removal
  //      [GiftRedeem, Winner] --> [GiftRedeem]
  //   - Move to ticket redeem step
  //      [GiftRedeem] --> [TicketRedeem]
  //
  // Involved in 1 Transaction as DataInput:
  //   - Gift redeem
  //      [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, UserBox]
  // 
  sigmaProp(true)
}
