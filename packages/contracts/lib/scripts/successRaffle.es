{
  // ErgoRaffle V2 Success Raffle Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnersCount, txFee, TotalPrize]
  //   R5[Coll[Coll[Byte]]]: [Seed, SelectedWinnersListHash]
  //   R6[Long]: Step
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  // Context:
  //   C0: Coll[Long]: SelectedWinnersList
  //   C1: Long: WinnerTicketIndex
  //
  // Spent in 2 transactions:
  //   - Winner prize creation
  //      [SuccessRaffle, Winner] --> [SuccessRaffle, WinnerPrize]
  //   - License redeem
  //      [Service, SuccessRaffle] --> [Service]
  // 
  sigmaProp(true)
}
