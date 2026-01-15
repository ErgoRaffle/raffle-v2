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
  //   - Gift addition
  //      [Proxy, Gift] --> [Proxy, SuccessRaffle, Change]
  //   - Proxy redeem
  //      [Proxy] --> [GiftGiverAddress]

  // Contract parameters (to be filled by generator)
  // User parameters
  val raffleId = fromBase64(RAFFLE_ID_B64)
  val winnerIndex = WINNER_INDEX
  val giftGiverAddress = fromBase64(GIFT_GIVER_ADDRESS_B64)

  if(HEIGHT < DEADLINE) {
    // Gift addition transaction
    // [Proxy, Gift] --> [Proxy, SuccessRaffle, Change]
    val successRaffle = OUTPUTS(1)
    sigmaProp(allOf(Coll(
      // Verify success raffle
      successRaffle.tokens(0)._1 == raffleId,
      successRaffle.R4[Int].get == winnerIndex,
      
      // Verify gift giver address
      blake2b256(OUTPUTS(2).propositionBytes) == giftGiverAddress,
    )))
  } else {
    // Proxy redeem
    // [Proxy] --> [GiftGiverAddress]
    sigmaProp(allOf(Coll(
      OUTPUTS.size == 1,
      blake2b256(OUTPUTS(0).propositionBytes) == giftGiverAddress,
    )))
  }
}
