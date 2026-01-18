{
  // ErgoRaffle V2 Donation Proxy Contract
  //
  // Tokens:
  //   0: RequiredToken (optional)
  // Context:
  //   C0: Coll[Long]: [TicketCount, RequiredTokenCount]
  //   C1: Coll[Coll[Byte]]: [RaffleId, DonatorAddress]
  //
  // Spent in 2 transactions:
  //   - Donation
  //      [ActiveRaffle, Proxy] --> [ActiveRaffle, Ticket]
  //   - Proxy redeem
  //      [Proxy] --> [DonatorAddress]

  // Contract parameters (to be filled by generator)
  // User parameters
  val ticketCount = TICKET_COUNT
  val raffleLicense = fromBase64("RAFFLE_LICENSE_B64")
  val raffleId = fromBase64("RAFFLE_ID_B64")
  val donatorErgoTreeHash = fromBase64("DONATOR_ERGO_TREE_HASH_B64")
  val ticketScriptHash = fromBase64("TICKET_SCRIPT_HASH_B64")
  val raffleDeadline = DEADLINE
  val txFee = TX_FEE
  val expirationHeight = EXPIRATION_HEIGHT

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
      OUTPUTS.size == 2,
      blake2b256(OUTPUTS(0).propositionBytes) == donatorErgoTreeHash,
      OUTPUTS(0).tokens == SELF.tokens,
      OUTPUTS(1).value <= txFee,
    )))
  }
}
