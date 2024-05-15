{
  // ErgoRaffle V2 Success Raffle Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnersCount, txFee, TotalPrize]
  //   R5[Coll[Byte]]: Seed
  //   R6[Coll[Long]]: SelectedWinnersList
  //   R7[Coll[Long]]: [Step]
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  // Context:
  //   C0: Long: WinnerTicketIndex
  //
  // Spent in 2 transactions:
  //   - Winner prize creation
  //      [SuccessRaffle, Winner] --> [SuccessRaffle, WinnerPrize]
  //   - License redeem
  //      [Service, SuccessRaffle] --> [Service]
  // 
  sigmaProp(true)
}
