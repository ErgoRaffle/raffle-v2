{
  // ErgoRaffle V2 Success Raffle Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [TotalPrize, totalSoldTickets, TxFee]
  //   R5[Int]: WinnersCount
  //   R6[Coll[Byte]]: ProjectAddressHash
  //   R7[Coll[Coll[Byte]]]: [Seed, SelectedWinnersListHash]
  //   R8[Int]: Step
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  // Context:
  //   C0: Coll[Long]: SelectedWinnersList
  //   C1: Long: WinnerTicketIndex
  //
  // Spent in 2 transactions:
  //   - Winner prize creation
  //      [SuccessRaffle, Winner] --> [SuccessRaffle, WinnerPrize]
  //   - License redeem
  //      [Service, SuccessRaffle] --> [Service, ProjectFund]
  // 
  val serviceNft = fromBase64("SERVICE_NFT_B64")

  val winnersCount = SELF.R5[Int].get
  val step = SELF.R8[Int].get
  val isErgGoal = SELF.tokens.size == 2
  if(step <= winnersCount) {
    // Winner prize creation
    // [SuccessRaffle, Winner] --> [SuccessRaffle, WinnerPrize]
    val outSuccessRaffle = OUTPUTS(0)
    val winner = INPUTS(1)
    val winnerPrize = OUTPUTS(1)
    val selectedWinners = getVar[Coll[Long]](0).get
    val winnerTicketIndex = getVar[Long](1).get
    val selectedWinnersBytes = selectedWinners
      .append(Coll[Long](winnerTicketIndex))
      .fold(
        Coll[Byte](), 
        {(res: Coll[Byte], p: Long) => res ++ longToByteArray(p)}
      )
    val totalPrize = SELF.R4[Coll[Long]].get(0)
    val rewardPercent = winner.R4[Coll[Long]].get(0)
    val winnerReward = totalPrize * rewardPercent / 1000
    val checkRemainingPrize = if(isErgGoal){
      outSuccessRaffle.value >= SELF.value - winnerReward
    } else {
      outSuccessRaffle.tokens(2)._1 == SELF.tokens(2)._1 &&
      outSuccessRaffle.tokens(2)._2 >= SELF.tokens(2)._2 - winnerReward &&
      outSuccessRaffle.value == SELF.value
    }
    val calculatedWinnerTicketIndex = {
      val seed = SELF.R7[Coll[Coll[Byte]]].get(0).slice(0, 16)
      val range = SELF.R4[Coll[Long]].get(1) - step + 1
      val rawIndex = ((byteArrayToBigInt(seed).toBigInt % range) + range) % range
      val previousWinners = selectedWinners.filter(
        {(winNumber: Long) => { winNumber < winnerTicketIndex }}
      )
      rawIndex + previousWinners.size
    }
    val sameSelectedWinners = selectedWinners.filter(
      {(winNumber: Long) => { winNumber == winnerTicketIndex }}
    )
    sigmaProp(allOf(Coll(
      // Correct SuccessRaffle format
      outSuccessRaffle.propositionBytes == SELF.propositionBytes,
      outSuccessRaffle.tokens(0)._1 == SELF.tokens(0)._1,
      outSuccessRaffle.tokens(1)._1 == SELF.tokens(1)._1,
      outSuccessRaffle.tokens(1)._2 == SELF.tokens(1)._2,
      outSuccessRaffle.tokens.size == SELF.tokens.size,
      checkRemainingPrize,
      outSuccessRaffle.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      outSuccessRaffle.R5[Int].get == winnersCount,
      outSuccessRaffle.R6[Coll[Byte]].get == SELF.R6[Coll[Byte]].get,
      outSuccessRaffle.R7[Coll[Coll[Byte]]].get(0) == 
        blake2b256(SELF.R7[Coll[Coll[Byte]]].get(0)),
      outSuccessRaffle.R7[Coll[Coll[Byte]]].get(1) == blake2b256(selectedWinnersBytes),
      outSuccessRaffle.R8[Int].get == step + 1,

      // Correct Winner format
      // R4: [WinnerIndex, RewardPercent, DeadlineTimestamp, txFee]
      // R5: GiftCount
      winner.tokens(0)._1 == SELF.tokens(1)._1,
      winner.R5[Int].get == step,

      // Correct WinnerPrize format
      // R4: [WinnerTicketIndex, WinnerIndex, GiftCount]
      // R5: UnwrappedGiftCount
      winnerPrize.R4[Coll[Long]].get(0) == winnerTicketIndex,

      // Transaction constraints
      calculatedWinnerTicketIndex == winnerTicketIndex,
      sameSelectedWinners.size == 0,
    )))
  } else {
    // License redeem
    // [Service, SuccessRaffle] --> [Service, ProjectFund]
    val service = OUTPUTS(0)
    val projectFund = OUTPUTS(1)
    val txFee = SELF.R4[Coll[Long]].get(2)
    val projectAddressHash = SELF.R6[Coll[Byte]].get
    sigmaProp(allOf(Coll(
      // Correct Service format
      service.tokens(0)._1 == serviceNft,
      service.tokens(1)._1 == SELF.tokens(0)._1,

      // Correct ProjectFund format
      blake2b256(projectFund.propositionBytes) == projectAddressHash,
      projectFund.value == SELF.value - txFee,
      if(!isErgGoal) projectFund.tokens(0) == SELF.tokens(2) else true
    )))
  }
}
