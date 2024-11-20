{
  // ErgoRaffle V2 Gift Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: [DonatorErgoTreeHash]
  //   R5[Int]: WinnerIndex
  //   R6[Long]: txFee
  // Tokens:
  //   0: GiftToken
  //   1: Gift
  //
  // Spent in 4 transactions:
  //   - Gift unwrap
  //      [WinnerPrize, Gift] + [(DataInput)Ticket] --> [WinnerPrize, redeemedGift]
  //   - Gift redeem (for failed raffle) 
  //      [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, unwrappedGift]
  //
  val safePayScriptHash = fromBase64("SAFE_PAY_SCRIPT_HASH_B64")
  val winnerPrizeScriptHash = fromBase64("WINNER_PRIZE_SCRIPT_HASH_B64")

  val safePayBox = OUTPUTS(1)
  val txFee = SELF.R6[Long].get
  val safePayTokens = 
    if(SELF.tokens.size > 1) safePayBox.tokens == SELF.tokens.slice(1, SELF.tokens.size) else true

  val txConstraints = 
    OUTPUTS(0).tokens(1)._1 == SELF.tokens(0)._1 && // winner or winner prize gift token
    INPUTS(1).id == SELF.id && // Prevent spending multiple gifts
    // Correct Safe Pay format
    blake2b256(safePayBox.propositionBytes) == safePayScriptHash &&
    safePayBox.value == SELF.value - txFee &&
    safePayTokens &&
    safePayBox.R5[Long].get == txFee

  if(blake2b256(OUTPUTS(0).propositionBytes) == winnerPrizeScriptHash){
    // Gift unwrap
    // [WinnerPrize, Gift] + [(DataInput)Ticket] --> [WinnerPrize, redeemedGift]
    val winnerTicket = CONTEXT.dataInputs(0)
    sigmaProp(allOf(Coll(
      safePayBox.R4[Coll[Byte]].get == winnerTicket.R4[Coll[Byte]].get,
      txConstraints
    )))
  } else {
    // Gift redeem (for failed raffle) 
    // [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, unwrappedGift]
    sigmaProp(allOf(Coll(
      safePayBox.R4[Coll[Byte]].get == SELF.R4[Coll[Byte]].get,
      txConstraints
    )))  
  }
}
