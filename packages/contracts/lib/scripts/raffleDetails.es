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
  val raffleLicense = fromBase64("RAFFLE_LICENSE_B64")
  val activeRaffleScriptHash = fromBase64("ACTIVE_RAFFLE_SCRIPT_HASH_B64")

  val activeRaffle = INPUTS(0)
  val deadline = activeRaffle.R4[Coll[Long]].get(5)
  sigmaProp(allOf(Coll(
    // Correct ActiveRaffle format
    blake2b256(activeRaffle.propositionBytes) == activeRaffleScriptHash,
    activeRaffle.tokens(0)._1 == raffleLicense,
    activeRaffle.tokens(1)._1 == SELF.tokens(0)._1,
    deadline < HEIGHT,
  )))
}
