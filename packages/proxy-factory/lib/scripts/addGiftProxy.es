{
  // ErgoRaffle V2 Add Gift Proxy Contract
  //
  // Tokens:
  //   0: GiftToken (optional)
  // Context:
  //   C0: Coll[Long]: [WinnerIndex]
  //   C1: Coll[Coll[Byte]]: [RaffleId, GiftGiverAddress]
  //
  // Spent in 2 transactions:
  //   - New gift creation
  //      [Winner, Proxy] --> [Winner, Gift]
  //   - Proxy redeem
  //      [Proxy] --> [GiftGiverAddress]

  // Contract parameters (to be filled by generator)
  // User parameters
  val raffleId = fromBase64("RAFFLE_ID_B64")
  val winnerIndex = WINNER_INDEX
  val giftGiverErgoTreeHash = fromBase64("GIFT_GIVER_ERGO_TREE_HASH_B64")
  val giftScriptHash = fromBase64("GIFT_SCRIPT_HASH_B64")
  val txFee = TX_FEE
  val raffleDeadline = DEADLINE
  val expirationHeight = EXPIRATION_HEIGHT

  if(HEIGHT < expirationHeight && HEIGHT < raffleDeadline) {
    // Gift addition transaction
    // [Winner, Proxy] --> [Winner, Gift]
    val winner = OUTPUTS(0)
    val gift = OUTPUTS(1)
    sigmaProp(allOf(Coll(
      // Correct winner format
      // R4[Coll[Long]]: [RewardPercent, Deadline, txFee]
      // R5[Int]: WinnerIndex
      winner.tokens(0)._1 == raffleId,
      winner.R5[Int].get == winnerIndex,
      
      // Correct gift format
      // R4[Coll[Byte]]: [DonatorErgoTreeHash]
      // R5[Int]: WinnerIndex
      gift.R4[Coll[Byte]].get == giftGiverErgoTreeHash,
      gift.R5[Int].get == winnerIndex,
      blake2b256(gift.propositionBytes) == giftScriptHash,
    )))
  } else {
    // Proxy redeem
    // [Proxy] --> [GiftGiverAddress]
    sigmaProp(allOf(Coll(
      INPUTS.size == 1,
      OUTPUTS.size == 2,
      blake2b256(OUTPUTS(0).propositionBytes) == giftGiverErgoTreeHash,
      OUTPUTS(0).tokens == SELF.tokens,
      OUTPUTS(1).value <= txFee,
    )))
  }
}
