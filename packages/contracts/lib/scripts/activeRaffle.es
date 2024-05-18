{
  // ErgoRaffle V2 Active Raffle Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [CharityPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, DeadlineTimestamp, WinnersCount, txFee]
  //   R5[Coll[Coll[Byte]]]: [ServiceAddressHash, ImplementerAddressHash, CreatorAddressHash]
  //   R6[Coll[Long]]: [TotalSoldTicket]
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  //
  // Spent in 3 transactions:
  //   - Donation
  //      [ActiveRaffle, UserBox] --> [ActiveRaffle, Ticket]
  //   - Successful end
  //      [ActiveRaffle, RaffleDetail] + [(DataInput)Oracle] --> [SuccessRaffle, ProjectFund, ServiceFee, ImplementerFee]
  //   - Failure end
  //      [ActiveRaffle, RaffleDetail] --> [GiftRedeem]
  // 
  sigmaProp(true)
}
