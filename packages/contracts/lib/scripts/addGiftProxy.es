{
  // ErgoRaffle V2 Add Gift Proxy Contract
  //
  // Tokens:
  //   0: GiftToken (optional)
  //
  // SELF Registers:
  //   R4: Coll[Long] = [
  //         expirationHeight,
  //         raffleDeadline,
  //         winnerIndex,
  //         txFee
  //       ]
  //
  //   R5: Coll[Coll[Byte]] = [
  //         raffleId,
  //         giftGiverErgoTreeHash
  //       ]
  //
  // Context:
  //   C0: Coll[Byte]: [GiftGiverErgoTree]
  //
  // Spent in 2 transactions:
  //   - New gift creation
  //      [Winner, Proxy] --> [Winner, Gift]
  //   - Proxy redeem
  //      [Proxy] --> [GiftGiverAddress]

  // Contract parameters (to be filled from SELF registers)
  val giftScriptHash = fromBase64("GIFT_SCRIPT_HASH_B64")

  // User parameters
  val expirationHeight = SELF.R4[Coll[Long]].get(0)
  val raffleDeadline = SELF.R4[Coll[Long]].get(1)
  val winnerIndex = SELF.R4[Coll[Long]].get(2)
  val txFee =  SELF.R4[Coll[Long]].get(3)

  val raffleId = SELF.R5[Coll[Coll[Byte]]].get(0)
  val giftGiverErgoTreeHash = SELF.R5[Coll[Coll[Byte]]].get(1)


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
      gift.tokens.slice(1, gift.tokens.size) == SELF.tokens,
      gift.value >= SELF.value - txFee,
    )))
  } else {
    // Proxy redeem
    // [Proxy] --> [GiftGiverAddress]
    sigmaProp(allOf(Coll(
      INPUTS(0).id == SELF.id,
      blake2b256(OUTPUTS(0).propositionBytes) == giftGiverErgoTreeHash,
      OUTPUTS(0).tokens == SELF.tokens,
      OUTPUTS(0).value >= SELF.value - txFee,
    )))
  }
}
