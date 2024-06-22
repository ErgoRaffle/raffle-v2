{
  // ErgoRaffle V2 Winner Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnerIndex, RewardPercent, DeadlineTimestamp, txFee]
  //   R5[Long]: GiftCount
  //   R6[Coll[Byte]]: GiftTokenId
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
  val winnerIndex = SELF.R4[Coll[Long]].get(0)
  val deadline = SELF.R4[Coll[Long]].get(2)
  val txFee = SELF.R4[Coll[Long]].get(3)
  val giftCount = SELF.R5[Long].get
  val selfReplication = allOf(Coll(
    outWinner.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
    outWinner.tokens(0)._1 == SELF.tokens(0)._1,
    outWinner.value == SELF.value
  ))
  
  if(SELF.tokens.size == 1) {
    // Winner box gift token receipt
    // [Winner, GiftTokenRepo] --> [Winner, GiftTokenRepo(optional)]
    val giftTokenRepo = INPUTS(1)
    val giftTokenId = SELF.R6[Coll[Byte]].get
    sigmaProp(allOf(Coll(
      // Correct Winner format  
      selfReplication,
      outWinner.R5[Long].get == giftCount,
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
      val rewardPercent = SELF.R4[Coll[Long]].get(1)
      val totalPrize = successRaffle.R4[Coll[Long]].get(2)
      val isErgGoal = (successRaffle.tokens.size == 2)
      val prizeValidation = if(isErgGoal) {
        winnerPrize.value == totalPrize * rewardPercent / 1000 + 2 * txFee
      } else {
        allOf(Coll(
          winnerPrize.tokens(1)._1 == successRaffle.tokens(2)._1,
          winnerPrize.tokens(1)._2 == totalPrize * rewardPercent / 1000,
          winnerPrize.value == 2 * txFee
        ))
      }
      sigmaProp(allOf(Coll(
        // Correct WinnerPrize format
        // R4: [WinnerTicketIndex, WinnerIndex, GiftCount]
        // R5: UnwrappedGiftCount
        prizeValidation,
        blake2b256(winnerPrize.propositionBytes) == winnerPrizeScriptHash,
        winnerPrize.tokens(0)._1 == SELF.tokens(0)._1,
        winnerPrize.tokens(1)._1 == SELF.tokens(1)._1,
        winnerPrize.tokens(1)._2 == SELF.tokens(1)._2,
        winnerPrize.R4.Coll[Long].get(1) == winnerIndex,
        winnerPrize.R4.Coll[Long].get(2) == giftCount,
        winnerPrize.R5[Long].get == 0,

        // Correct SuccessRaffle format
        successRaffle.tokens(1)._1 == SELF.tokens(0)._1,
      )))
    } else { sigmaProp(false) }
  }
  else if (HEIGHT > deadline) {
    // Gift redeem (for failed raffle) 
    // [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, UserBox]
    val giftRedeem = dataInputs(0)
    val gift = INPUTS(1)
    sigmaProp(
      // Correct GiftRedeem format
      blake2b256(giftRedeem.propositionBytes) == giftRedeemScriptHash
      giftRedeem.tokens(0)._1 == raffleLicense,

      // Correct Winner format
      selfReplication,
      outWinner.tokens(1)._1 == SELF.tokens(1)._1,
      outWinner.tokens(1)._2 == SELF.tokens(1)._1 + 1,
      outWinner.R5[Long].get == giftCount - 1,

      // Correct Gift format
      gift.tokens(0)._1 == SELF.tokens(1)._1,
      gift.R5[Long] == winnerIndex,

      // Transaction constraints
      INPUTS.size == 2, // Prevent multiple gifts
    )
  } 
  else {
    // New gift creation
    // [Winner, UserBox] --> [Winner, Gift]
    val gift = OUTPUTS(0)
    sigmaProp(allOf(Coll(
      // Correct Winner format
      selfReplication,
      outWinner.tokens(1)._1 == SELF.tokens(1)._1,
      outWinner.tokens(1)._2 == SELF.tokens(1)._2 - 1,

      // Correct Gift format
      // R4[Coll[Byte]]: [DonatorAddress]
      // R5[Long]: [WinnerIndex]
      blake2b256(gift.propositionBytes) == giftScriptHash,
      gift.tokens(0)._1 == SELF.tokens(1)._1,
      gift.value >= 2 * txFee,
      gift.R5[Long].get == winnerIndex,
    )))
  }
}
