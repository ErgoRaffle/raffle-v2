{
  // ErgoRaffle V2 WinnerPrize Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnerTicketIndex, GiftCount, TxFee]
  //   R5[Int]: WinnerIndex
  //   R6[Long]: UnwrappedGiftCount
  // Tokens:
  //   0: Ticket
  //   1: GiftToken
  //   2: CollectingToken (if token-goal raffle)
  // Context:
  //   0: Coll[Byte]: WinnerErgoTree
  //
  // Spent in 2 transactions:
  //   - Gift unwrap
  //      [WinnerPrize, Gift] + [(DataInput)Ticket] --> [WinnerPrize, UnwrappedGift]
  //   - Winner Reward
  //      [WinnerPrize] + [(DataInput)Ticket] --> [FinalPrize]
  //
  val safePayScriptHash = fromBase64("SAFE_PAY_SCRIPT_HASH_B64")
  val ticketScriptHash = fromBase64("TICKET_SCRIPT_HASH_B64")

  val winnerTicketIndex = SELF.R4[Coll[Long]].get(0)
  val giftCount = SELF.R4[Coll[Long]].get(1)
  val txFee = SELF.R4[Coll[Long]].get(2)
  val winnerIndex = SELF.R5[Int].get
  val UnwrappedGiftCount = SELF.R6[Long].get
  val winnerTicket = CONTEXT.dataInputs(0)
  val isTicketCorrect =
    blake2b256(winnerTicket.propositionBytes) == ticketScriptHash &&
    winnerTicket.tokens(0)._1 == SELF.tokens(0)._1 &&
    winnerTicket.R5[Coll[Long]].get(0) <= winnerTicketIndex &&
    winnerTicket.R5[Coll[Long]].get(1) > winnerTicketIndex

  if(giftCount > UnwrappedGiftCount){
    // Gift unwrap
    // [WinnerPrize, Gift] + [(DataInput)Ticket] --> [WinnerPrize, UnwrappedGift]
    val gift = INPUTS(1)
    val outWinnerPrize = OUTPUTS(0)
    val unwrappedGift = OUTPUTS(1)
    sigmaProp(allOf(Coll(
      // Correct WinnerPrize format
      outWinnerPrize.propositionBytes == SELF.propositionBytes,
      outWinnerPrize.value == SELF.value,
      outWinnerPrize.tokens.size == SELF.tokens.size,
      outWinnerPrize.tokens(0) == SELF.tokens(0),
      outWinnerPrize.tokens(1)._1 == SELF.tokens(1)._1,
      outWinnerPrize.tokens(1)._2 == SELF.tokens(1)._2 + 1,
      if(SELF.tokens.size == 3) outWinnerPrize.tokens(2) == SELF.tokens(2) else true,
      outWinnerPrize.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      outWinnerPrize.R5[Int].get == winnerIndex,
      outWinnerPrize.R6[Long].get == SELF.R6[Long].get + 1,

      // Correct Gift format
      // R4: [DonatorErgoTreeHash]
      // R5: WinnerIndex
      gift.tokens(0)._1 == SELF.tokens(1)._1,
      gift.R5[Int].get == winnerIndex,

      // Transaction constraints
      isTicketCorrect,
    )))
  } else {
    // Winner Reward
    // [WinnerPrize] + [(DataInput)Ticket] --> [FinalPrize]
    val finalPrize = OUTPUTS(0)
    val hasStolenTokens = { (stolenTokenId: Coll[Byte]) =>
        OUTPUTS.exists{ (box: Box) => 
          box.tokens.exists{(token: (Coll[Byte], Long)) => token._1 == stolenTokenId}
      }
    }
    sigmaProp(allOf(Coll(
      // Correct final prize
      blake2b256(finalPrize.propositionBytes) == safePayScriptHash,
      finalPrize.value == SELF.value - txFee,
      if(SELF.tokens.size == 3) finalPrize.tokens(0) == SELF.tokens(2) else true,
      finalPrize.R4[Coll[Byte]].get == winnerTicket.R4[Coll[Byte]].get,
      finalPrize.R5[Long].get == txFee,
      blake2b256(getVar[Coll[Byte]](0).get) == finalPrize.R4[Coll[Byte]].get,

      // Transaction constraints
      isTicketCorrect,
      hasStolenTokens(SELF.tokens(0)._1) == false,
      hasStolenTokens(SELF.tokens(1)._1) == false,
    )))
  }
}
