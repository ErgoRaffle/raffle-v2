{
  // ErgoRaffle V2 Gift Redeem Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [TotalSoldTicket, TicketPrice, txFee]
  //   R5[Int]: WinnersCount
  //   R6[Int]: Step
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
  //   - Gift return
  //      [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, returnedGift]
  // 
  val ticketRedeemScriptHash = fromBase64("TICKET_REDEEM_SCRIPT_HASH_B64")

  val txFee = SELF.R4[Coll[Long]].get(2)
  val winnersCount = SELF.R5[Int].get
  val step = SELF.R6[Int].get

  if(step <= winnersCount) {
    // Winner box removal
    // [GiftRedeem, Winner] --> [GiftRedeem]
    val winner = INPUTS(1)
    val outGiftRedeem = OUTPUTS(0)
    sigmaProp(allOf(Coll(true,
      // Correct GiftRedeem format
      outGiftRedeem.propositionBytes == SELF.propositionBytes,
      outGiftRedeem.value >= SELF.value + winner.value - txFee,
      outGiftRedeem.tokens.size == SELF.tokens.size,
      outGiftRedeem.tokens(0) == SELF.tokens(0),
      outGiftRedeem.tokens(1)._1 == SELF.tokens(1)._1,
      outGiftRedeem.tokens(1)._2 == SELF.tokens(1)._2 + 1,
      if(SELF.tokens.size > 2) outGiftRedeem.tokens(2) == SELF.tokens(2) else true,
      outGiftRedeem.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      outGiftRedeem.R5[Int].get == SELF.R5[Int].get,
      outGiftRedeem.R6[Int].get == SELF.R6[Int].get + 1,

      // Correct Winner format
      // R4: [RewardPercent, Deadline, txFee]
      // R5: WinnerIndex
      // R6: GiftCount
      winner.tokens(0)._1 == SELF.tokens(1)._1,
      winner.R5[Int].get == step,
    )))
  } else {
    // Move to ticket redeem step
    // [GiftRedeem] --> [TicketRedeem]
    val ticketRedeem = OUTPUTS(0)
    sigmaProp(allOf(Coll(
      // Correct Ticket Redeem format
      // R4[Coll[Long]]: [TotalSoldTicket, TicketPrice, txFee]
      // R5[Long]: RedeemedTickets
      blake2b256(ticketRedeem.propositionBytes) == ticketRedeemScriptHash,
      ticketRedeem.value >= SELF.value - txFee,
      ticketRedeem.tokens == SELF.tokens,
      ticketRedeem.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      ticketRedeem.R5[Long].get == 0L
    )))
  }
}
