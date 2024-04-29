{
  // ErgoRaffle V2 Inactive Raffle Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [CharityPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, DeadlineTimestamp, TotalSoldTicket, WinnersCount, CreationFee]
  //   R5[Coll[Coll[Byte]]]: [ServiceAddress, ImplementerAddress, CharityAddress]
  //   R6[Coll[Coll[Byte]]]: [Name, Description, Pictures(optional)]
  //   R7[Coll[Coll[Byte]]]: [TicketId, WinnersPercentListHash]
  // Tokens:
  //   0: RaffleLicense
  //   1: CollectingToken (if token-goal raffle)
  //
  // Spent in 1 transaction:
  //   - Active raffle creation
  //      [InactiveRaffle(Self), TicketRepo] --> [ActiveRaffle, RaffleDetails, GiftTokenRepo, Winner[]]
  // 

  val activeRaffleScriptHash = fromBase64("ACTIVE_RAFFLE_SCRIPT_HASH")
  val raffleDetailsScriptHash = fromBase64("RAFFLE_DETAILS_SCRIPT_HASH")
  val winnerScriptHash = fromBase64("WINNER_SCRIPT_HASH")
  val giftTokenCount = GIFT_TOKEN_COUNT
  val fee = FEE
  val minBoxValue = MIN_BOX_VALUE

  val activeRaffle = OUTPUTS(0)
  val raffleDetails = OUTPUTS(1)
  val giftTokenRepo = OUTPUTS(2)
  val winnersCount = SELF.R4[Coll[Long]].get(7).toInt
  val ticketId = SELF.R6[Coll[Coll[Byte]]].get(0)
  val winnersPercentListHash = SELF.R6[Coll[Coll[Byte]]].get(1)
  val winnerBoxes = OUTPUTS.slice(3, winnersCount + 3)

  val winnersVerification = winnerBoxes.indices.forall({(i: Int) => {
    val box = OUTPUTS(i + 3)
    allOf(Coll(
      // Correct Winner boxes format
      // R4: [WinnerIndex, rewardPercent]
      blake2b256(box.propositionBytes) == winnerScriptHash,
      box.tokens(0)._1 == ticketId, // Ticket token as identifier
      box.value == fee + minBoxValue,
      box.R4[Coll[Long]].get(0) == i + 1,
    ))
  }})
  val winnersPercentBytes = winnerBoxes.fold(
    Coll[Byte](),
    {(res: Coll[Byte], box: Box) => 
      res ++ longToByteArray(box.R4[Coll[Long]].get(1))}
  )
  val isErgGoal = (SELF.tokens.size == 1)
  val activeRaffleExtraTokensVerification = if(isErgGoal) {
      activeRaffle.tokens.size == 2
  } else {
    allOf(Coll(
      activeRaffle.tokens.size == 3,
      activeRaffle.tokens(2)._1 == SELF.tokens(1)._1,
      activeRaffle.tokens(2)._2 == SELF.tokens(1)._2
    ))
  }

  // Active raffle creation
  // [InactiveRaffle(Self), TicketRepo] --> [ActiveRaffle, RaffleDetails, Winner[]]
  sigmaProp(allOf(Coll(
    // Correct ActiveRaffle format
    // R4: [CharityPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, DeadlineTimestamp, TotalSoldTicket, WinnersCount, CreationFee]
    // R5: [ServiceAddress, ImplementerAddress, CharityAddress]
    blake2b256(activeRaffle.propositionBytes) == activeRaffleScriptHash,
    activeRaffle.tokens(0)._1 == SELF.tokens(0)._1,
    activeRaffle.tokens(1)._1 == ticketId, // Match with TicketRepo
    activeRaffle.value == SELF.value - (winnersCount * (fee + minBoxValue)),
    activeRaffle.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
    activeRaffle.R5[Coll[Coll[Byte]]].get == SELF.R5[Coll[Coll[Byte]]].get,
    activeRaffleExtraTokensVerification == true,

    // Correct RaffleDetails format
    // R4: [Name, Description, Pictures(optional)]
    blake2b256(raffleDetails.propositionBytes) == raffleDetailsScriptHash,
    raffleDetails.R4[Coll[Coll[Byte]]].get == SELF.R6[Coll[Coll[Byte]]].get,
    raffleDetails.tokens(0)._1 == ticketId, // Ticket token as identifier

    // Correct Winnners format
    winnersVerification == true,

    // Correct GiftTokenRepo format
    // R4, R5, R6: GiftToken metadata
    // R7: [WinnerIndex, rewardPercent]
    giftTokenRepo.tokens(1)._1 == SELF.id,
    giftTokenRepo.tokens(1)._2 == giftTokenCount * winnersCount,
    giftTokenRepo.R7[Coll[Int]].get == Coll[Int](giftTokenCount, winnersCount)

    // Transaction constraints
    winnersPercentListHash == blake2b256(winnersPercentBytes),
  )))
}
