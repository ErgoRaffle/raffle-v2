{
  // ErgoRaffle V2 Winner Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [RewardPercent, Deadline, txFee]
  //   R5[Int]: WinnerIndex
  //   R6[Long]: GiftCount
  //   R7[Coll[Byte]]: GiftTokenId (Exists only before the gift token receipt)
  // Tokens:
  //   0: Ticket
  //   1: GiftToken
  //
  // Spent in 5 transactions:
  //   - Winner box gift token receipt
  //      [Winner, GiftTokenRepo] --> [Winner, GiftTokenRepo(optional)]
  //   - New gift creation
  //      [Winner, UserBox] --> [Winner, Gift]
  //   - Winner prize creation (for successfully ended raffle) 
  //      [SuccessRaffle, Winner] --> [SuccessRaffle, WinnerPrize]
  //   - Gift redeem (for failed raffle) 
  //      [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, UserBox]
  //   - Winner box removal (for failed raffle)
  //      [GiftRedeem, Winner] --> [GiftRedeem]
  //

  val giftScriptHash = fromBase64("GIFT_SCRIPT_HASH_B64")
  val winnerPrizeScriptHash = fromBase64("WINNER_PRIZE_SCRIPT_HASH_B64")
  val successRaffleScriptHash = fromBase64("SUCCESS_RAFFLE_SCRIPT_HASH_B64")
  val giftRedeemScriptHash = fromBase64("GIFT_REDEEM_SCRIPT_HASH_B64")
  val raffleLicense = fromBase64("RAFFLE_LICENSE_B64")

  val outWinner = OUTPUTS(0)
  val deadline = SELF.R4[Coll[Long]].get(1)
  val txFee = SELF.R4[Coll[Long]].get(2)
  val winnerIndex = SELF.R5[Int].get
  val giftCount = SELF.R6[Long].get
  val selfReplication = allOf(Coll(
    outWinner.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
    outWinner.R5[Int].get == SELF.R5[Int].get,
    outWinner.tokens(0) == SELF.tokens(0),
    outWinner.value == SELF.value
  ))
  
  if(SELF.tokens.size == 1) {
    // Winner box gift token receipt
    // [Winner, GiftTokenRepo] --> [Winner, GiftTokenRepo(optional)]
    val giftTokenRepo = INPUTS(1)
    val giftTokenId = SELF.R7[Coll[Byte]].get
    sigmaProp(allOf(Coll(
      // Correct Winner format  
      selfReplication,
      outWinner.R6[Long].get == giftCount,
      outWinner.tokens(1)._1 == giftTokenId,
    )))
  } else if(INPUTS(0).tokens(0)._1 == raffleLicense) {
    if(blake2b256(INPUTS(0).propositionBytes) == giftRedeemScriptHash){
      // Winner box removal (for failed raffle)
      // [GiftRedeem, Winner] --> [GiftRedeem]
      val giftRedeem = INPUTS(0)
      val stolenGiftTokens = OUTPUTS.exists{(box: Box) => 
        box.tokens.exists{(token: (Coll[Byte], Long)) => token._1 == SELF.tokens(1)._1}
      }
      sigmaProp(allOf(Coll(
        giftRedeem.tokens(1)._1 == SELF.tokens(0)._1,
        giftCount == 0,
        stolenGiftTokens == false, // All gift tokens should burn
      )))
    } else if(blake2b256(INPUTS(0).propositionBytes) == successRaffleScriptHash){
      // Winner prize creation (for successfully ended raffle) 
      // [SuccessRaffle, Winner] --> [SuccessRaffle, WinnerPrize]
      val successRaffle = OUTPUTS(0)
      val winnerPrize = OUTPUTS(1)
      val rewardPercent = SELF.R4[Coll[Long]].get(0)
      val totalPrize = successRaffle.R4[Coll[Long]].get(0)
      val prizeAmount = totalPrize * rewardPercent / 1000 
      val hasTokenPrize = (successRaffle.tokens.size == 3 && prizeAmount > 0)
      val prizeValidation = if(hasTokenPrize) {
        allOf(Coll(
          winnerPrize.tokens(2)._1 == successRaffle.tokens(2)._1,
          winnerPrize.tokens(2)._2 == prizeAmount,
          winnerPrize.value == 3 * txFee
        ))
      } else {
        winnerPrize.value == prizeAmount + 3 * txFee
      }
      sigmaProp(allOf(Coll(
        // Correct WinnerPrize format
        // R4: [WinnerTicketIndex, GiftCount]
        // R5: WinnerIndex
        // R6: UnwrappedGiftCount
        prizeValidation,
        blake2b256(winnerPrize.propositionBytes) == winnerPrizeScriptHash,
        winnerPrize.tokens(0) == SELF.tokens(0),
        winnerPrize.tokens(1) == SELF.tokens(1),
        winnerPrize.R4[Coll[Long]].get(1) == giftCount,
        winnerPrize.R4[Coll[Long]].get(2) == txFee,
        winnerPrize.R5[Int].get == winnerIndex,
        winnerPrize.R6[Long].get == 0,

        // Correct SuccessRaffle format
        successRaffle.tokens(1)._1 == SELF.tokens(0)._1,
      )))
    } else { sigmaProp(false) }
  }
  else if (HEIGHT > deadline) {
    // Gift redeem (for failed raffle) 
    // [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, UserBox]
    val giftRedeem = CONTEXT.dataInputs(0)
    val gift = INPUTS(1)
    sigmaProp(allOf(Coll(
      // Correct GiftRedeem format
      blake2b256(giftRedeem.propositionBytes) == giftRedeemScriptHash,
      giftRedeem.tokens(0)._1 == raffleLicense,
      giftRedeem.tokens(1)._1 == SELF.tokens(0)._1,

      // Correct Winner format
      selfReplication,
      outWinner.tokens(1)._1 == SELF.tokens(1)._1,
      outWinner.tokens(1)._2 == SELF.tokens(1)._2 + 1,
      outWinner.R6[Long].get == giftCount - 1,

      // Correct Gift format
      gift.tokens(0)._1 == SELF.tokens(1)._1,
      gift.R5[Int].get == winnerIndex,

      // Transaction constraints
      INPUTS.size == 2, // Prevent multiple gifts
    )))
  } 
  else {
    // New gift creation
    // [Winner, UserBox] --> [Winner, Gift]
    val gift = OUTPUTS(1)
    sigmaProp(allOf(Coll(
      // Correct Winner format
      selfReplication,
      outWinner.tokens(1)._1 == SELF.tokens(1)._1,
      outWinner.tokens(1)._2 == SELF.tokens(1)._2 - 1,
      outWinner.R6[Long].get == giftCount + 1,

      // Correct Gift format
      // R4: [DonatorAddress]
      // R5: WinnerIndex
      blake2b256(gift.propositionBytes) == giftScriptHash,
      gift.tokens(0)._1 == SELF.tokens(1)._1,
      gift.value >= 2 * txFee,
      gift.R5[Int].get == winnerIndex,
    )))
  }
}
