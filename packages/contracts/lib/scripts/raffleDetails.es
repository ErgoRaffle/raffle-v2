{
  // ErgoRaffle V2 Raffle Detail Contract
  //
  // Registers:
  //   R4[Coll[Coll[Byte]]]: [Name, Description, Pictures(optional)]
  // Tokens:
  //   0: Ticket
  //
  // Spent in 2 transactions:
  //   - Successful end
  //      [ActiveRaffle, RaffleDetail] + [(DataInput)Oracle] --> [SuccessRaffle, ProjectFund, ServiceFee, ImplementerFee]
  //   - Failure end
  //      [ActiveRaffle, RaffleDetail] --> [GiftRedeem]
  // 
  sigmaProp(true)
}
