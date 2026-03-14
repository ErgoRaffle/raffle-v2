{
  // ErgoRaffle V2 Donation Proxy Contract
  //
  // Tokens:
  //   0: RequiredToken (optional)
  //
  // Registers:
  //   R4: Coll[Long] = [
  //         expirationHeight,
  //         raffleDeadline,
  //         ticketCount,
  //         txFee
  //       ]
  //
  //   R5: Coll[Coll[Byte]] = [
  //         raffleId,
  //         donatorErgoTreeHash
  //       ]
  //
  // Context:
  //   C0: Coll[Coll[Byte]]: [DonatorErgoTree]
  //
  // Spent in 2 transactions:
  //   - Donation
  //      [ActiveRaffle, Proxy] --> [ActiveRaffle, Ticket]
  //   - Proxy redeem
  //      [Proxy] --> [DonatorAddress]

  // Setup parameters
  val raffleLicense = fromBase64("RAFFLE_LICENSE_B64")
  val ticketScriptHash = fromBase64("TICKET_SCRIPT_HASH_B64")

  // User parameters
  val expirationHeight = SELF.R4[Coll[Long]].get(0)
  val raffleDeadline = SELF.R4[Coll[Long]].get(1)
  val ticketCount = SELF.R4[Coll[Long]].get(2)
  val txFee = SELF.R4[Coll[Long]].get(3)

  val raffleId = SELF.R5[Coll[Coll[Byte]]].get(0)
  val donatorErgoTreeHash = SELF.R5[Coll[Coll[Byte]]].get(1)


  if(HEIGHT < expirationHeight && HEIGHT < raffleDeadline) {
    // Donation
    // [ActiveRaffle, Proxy] --> [ActiveRaffle, Ticket]
    val activeRaffle = OUTPUTS(0)
    val ticket = OUTPUTS(1)
    sigmaProp(allOf(Coll(
      // Correct active raffle format
      activeRaffle.tokens(0)._1 == raffleLicense,
      activeRaffle.tokens(1)._1 == raffleId, 

      // Correct ticket format
      // R4: [DonatorErgoTreeHash]
      ticket.tokens(0)._1 == raffleId, 
      ticket.tokens(0)._2 == ticketCount,
      blake2b256(ticket.propositionBytes) == ticketScriptHash,
      ticket.R4[Coll[Byte]].get == donatorErgoTreeHash,  
    )))
  } else {
    // Proxy redeem
    // [Proxy] --> [DonatorAddress]
    sigmaProp(allOf(Coll(
      INPUTS.size == 1,
      blake2b256(OUTPUTS(0).propositionBytes) == donatorErgoTreeHash,
      OUTPUTS(0).tokens == SELF.tokens,
      OUTPUTS(0).value >= SELF.value - txFee  
    )))
  }
}
