{
  // ErgoRaffle V2 Ticket Repo Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: tokenName
  //   R5[Coll[Byte]]: tokenDescription
  //   R6[Coll[Byte]]: Decimals (0)
  // Tokens:
  //   0: Ticket
  //
  // Spent in 1 transaction:
  //   - Active raffle creation
  //      [InactiveRaffle, TicketRepo] --> [ActiveRaffle, RaffleDetails, Winner[]]
  //

  val raffleLicense =  fromBase64("RAFFLE_LICENSE_B64")

  val inactiveRaffle = INPUTS(0)
  val activeRaffle = OUTPUTS(0)
  val winnerCount = inactiveRaffle.R4[Coll[Long]].get(6)
  // Active raffle creation
  // [InactiveRaffle, TicketRepo] --> [ActiveRaffle, RaffleDetails, Winner[]]
  sigmaProp(allOf(Coll(
    // Correct ActiveRaffle format
    activeRaffle.tokens(0)._1 == raffleLicense,
    activeRaffle.tokens(1)._1 == SELF.tokens(0)._1,
    activeRaffle.tokens(1)._2 == SELF.tokens(0)._2 - winnerCount - 1, // Winner and RaffleDetail identifiers

    // Transaction constraints
    inactiveRaffle.R7[Coll[Coll[Byte]]].get(0) == SELF.tokens(0)._1
  )))
}
