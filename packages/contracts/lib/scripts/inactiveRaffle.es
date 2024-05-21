{
  // ErgoRaffle V2 Inactive Raffle Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [CharityPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, DeadlineTimestamp, WinnersCount, txFee]
  //   R5[Coll[Coll[Byte]]]: [ServiceAddressHash, ImplementerAddressHash, CreatorAddressHash]
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

  val activeRaffleScriptHash = fromBase64("ACTIVE_RAFFLE_SCRIPT_HASH_B64")
  val raffleDetailsScriptHash = fromBase64("RAFFLE_DETAILS_SCRIPT_HASH_B64")
  val winnerScriptHash = fromBase64("WINNER_SCRIPT_HASH_B64")
  val giftTokenCount = GIFT_TOKEN_COUNT

  val activeRaffle = OUTPUTS(0)
  val raffleDetails = OUTPUTS(1)
  val giftTokenRepo = OUTPUTS(2)
  val deadlineTimestamp = SELF.R4[Coll[Long]].get(5)
  val winnersCount = SELF.R4[Coll[Long]].get(6).toInt
  val txFee = SELF.R4[Coll[Long]].get(7).toInt
  val ticketId = SELF.R7[Coll[Coll[Byte]]].get(0)
  val winnersPercentListHash = SELF.R7[Coll[Coll[Byte]]].get(1)
  val winnerBoxes = OUTPUTS.slice(3, winnersCount + 3)

  val winnersVerification = winnerBoxes.indices.forall({(i: Int) => {
    val box = OUTPUTS(i + 3)
    allOf(Coll(
      // Correct Winner boxes format
      // R4: [WinnerIndex, RewardPercent, DeadlineTimestamp, TxFee]
      // R5: GiftCount
      // R6: GiftTokenId
      blake2b256(box.propositionBytes) == winnerScriptHash,
      box.tokens(0)._1 == ticketId, // Ticket token as identifier
      box.tokens.size == 1,
      box.value == 2 * txFee,
      box.R4[Coll[Long]].get(0) == i + 1,
      box.R4[Coll[Long]].get(2) == deadlineTimestamp,
      box.R4[Coll[Long]].get(3) == txFee,
      box.R5[Long].get == 0, // No gift at the beginning
      box.R6[Coll[Byte]].get == SELF.id,
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
  val hasStolenGiftTokens = OUTPUTS.exists{
    (box: Box) => 
      box.id != giftTokenRepo.id &&
      box.tokens.exists{(token: (Coll[Byte], Long)) => token._1 == SELF.id}
  }

  // Active raffle creation
  // [InactiveRaffle(Self), TicketRepo] --> [ActiveRaffle, RaffleDetails, Winner[]]
  sigmaProp(allOf(Coll(
    // Correct ActiveRaffle format
    // R4: [CharityPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, DeadlineTimestamp, WinnersCount, TxFee]
    // R5: [ServiceAddressHash, ImplementerAddressHash, CreatorAddressHash]
    // R6: [TotalSoldTicket]
    blake2b256(activeRaffle.propositionBytes) == activeRaffleScriptHash,
    activeRaffle.tokens(0)._1 == SELF.tokens(0)._1,
    activeRaffle.tokens(1)._1 == ticketId, // Match with TicketRepo
    activeRaffle.value == SELF.value - (3 * txFee * winnersCount) - txFee,
    activeRaffle.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
    activeRaffle.R5[Coll[Coll[Byte]]].get == SELF.R5[Coll[Coll[Byte]]].get,
    activeRaffle.R6[Coll[Long]].get(0) == 0L, // No sold ticket at beginning
    activeRaffleExtraTokensVerification == true,

    // Correct RaffleDetails format
    // R4: [Name, Description, Pictures(optional)]
    blake2b256(raffleDetails.propositionBytes) == raffleDetailsScriptHash,
    raffleDetails.R4[Coll[Coll[Byte]]].get == SELF.R6[Coll[Coll[Byte]]].get,
    raffleDetails.tokens(0)._1 == ticketId, // Ticket token as identifier
    raffleDetails.value == txFee,

    // Correct Winners format
    winnersVerification == true,

    // Correct GiftTokenRepo format
    // R4, R5, R6: GiftToken metadata
    // R7: [GiftTokenCount, WinnersCount, TxFee]
    // R8: TicketId
    giftTokenRepo.tokens.size == 1,
    giftTokenRepo.tokens(0)._1 == SELF.id,
    giftTokenRepo.tokens(0)._2 == giftTokenCount * winnersCount,
    giftTokenRepo.R7[Coll[Int]].get == Coll[Int](giftTokenCount, winnersCount, txFee),
    giftTokenRepo.R8[Coll[Byte]].get == ticketId,
    giftTokenRepo.R9[Int].get == 1,
    giftTokenRepo.value == (txFee * winnersCount),

    // Transaction constraints
    winnersPercentListHash == blake2b256(winnersPercentBytes),
    hasStolenGiftTokens == false
  )))
}
