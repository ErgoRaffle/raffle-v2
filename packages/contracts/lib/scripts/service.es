{
  // ErgoRaffle V2 Service Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [ServiceFeePercent, ImplementerFeePercent, CreationFee, TxFee]
  //   R5[Coll[Byte]]: ServiceFeeErgoTreeHash
  // Tokens:
  //   0: ServiceNft
  //   1: RaffleLicense
  // Context:
  //   C0: Coll[Long]: WinnersPercentList (in raffle creation tx)
  //   C1: Coll[Coll[Byte]]: [ImplementerErgoTree, CreatorErgoTree]
  //
  // Spent in 3 transactions:
  //   - Owner config update with OwnerNft
  //   - RaffleLicense redeem from SuccessRaffle or TicketRedeem
  //      [Service, (SuccessRaffle | TicketRedeem)] --> [Service, (ProjectFund | ServiceFee)]
  //   - New raffle creation
  //      [Service, UserBox] --> [Service, TicketRepo, InactiveRaffle, Change]
  // 

  val ownerNft = fromBase64("OWNER_NFT_B64")
  val inactiveRaffleScriptHash = fromBase64("INACTIVE_RAFFLE_SCRIPT_HASH_B64")
  val ticketRepoScriptHash = fromBase64("TICKET_REPO_SCRIPT_HASH_B64")

  if (OUTPUTS(0).tokens(0)._1 == ownerNft) {
    // Owner can spend and update the service box with the owner nft
    sigmaProp(true)
  } else {
    val outputService = OUTPUTS(0)
    val raffleLicense = SELF.tokens(1)._1
    val selfReplication = allOf(Coll(
      outputService.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      outputService.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get,
      outputService.propositionBytes == SELF.propositionBytes,
      outputService.tokens(0) == SELF.tokens(0),
      outputService.tokens(1)._1 == raffleLicense,
      outputService.value >= SELF.value,
      outputService.tokens.size == SELF.tokens.size,
    ))
    if(outputService.tokens(1)._2 == SELF.tokens(1)._2 + 1L) {
      // RaffleLicense redeem from SuccessRaffle or TicketRedeem
      // [Service, (SuccessRaffle | TicketRedeem)] --> [Service, (ProjectFund | ServiceFee)]
      sigmaProp(selfReplication)
    } else if (outputService.tokens(1)._2 == SELF.tokens(1)._2 - 1L) {
      // New raffle creation
      // [Service, UserBox] --> [Service, TicketRepo, InactiveRaffle, Change]
      val winnersPercentList = getVar[Coll[Long]](0).get
      val winnersPercentBytes = winnersPercentList.fold(
        Coll[Byte](), 
        {(res: Coll[Byte], p: Long) => res ++ longToByteArray(p)}
      )
      val winnerPercentsSum = winnersPercentList.fold(0L, {(x: Long, y: Long) => x + y})
      val winnersCount = winnersPercentList.size
      val hasStolenTickets = OUTPUTS.slice(2, OUTPUTS.size)
        .exists{
          (box: Box) => 
            box.tokens.exists{(token: (Coll[Byte], Long)) => token._1 == SELF.id}
        }
      val ticketRepo = OUTPUTS(1)
      val inactiveRaffle = OUTPUTS(2)
      val serviceFeePercent = SELF.R4[Coll[Long]].get(0)
      val implementerFeePercent = SELF.R4[Coll[Long]].get(1)
      val creationFee = SELF.R4[Coll[Long]].get(2)
      val txFee = SELF.R4[Coll[Long]].get(3)
      val serviceFeeErgoTreeHash = SELF.R5[Coll[Byte]].get
      val implementerErgoTree = getVar[Coll[Coll[Byte]]](1).get(0)
      val creatorErgoTree = getVar[Coll[Coll[Byte]]](1).get(1)
      val raffleGoal = inactiveRaffle.R4[Coll[Long]].get(4)
      val winnersSharePercent = inactiveRaffle.R4[Coll[Long]].get(0)
      val projectPercent = 1000L - (winnersSharePercent + serviceFeePercent + implementerFeePercent)

      sigmaProp(allOf(Coll(
        // Correct Service format
        selfReplication,

        // Correct TicketRepo format
        blake2b256(ticketRepo.propositionBytes) == ticketRepoScriptHash,
        ticketRepo.tokens(0)._1 == SELF.id,
        ticketRepo.tokens.size == 1, // Not to steal tickets
        ticketRepo.value == txFee,

        // Correct InactiveRaffle format
        // R4: [WinnersPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, Deadline, TxFee]
        // R5: [ServiceErgoTreeHash, ImplementerErgoTreeHash, CreatorErgoTreeHash]
        // R6: [Name, Description, Pictures(optional)]
        // R7: [TicketId, WinnersPercentListHash]
        // R8: WinnersCount
        blake2b256(inactiveRaffle.propositionBytes) == inactiveRaffleScriptHash,
        inactiveRaffle.tokens(0)._1 == raffleLicense,
        inactiveRaffle.tokens.size <= 2,
        inactiveRaffle.R4[Coll[Long]].get.size == 7,
        inactiveRaffle.R4[Coll[Long]].get(0) >= 0,
        inactiveRaffle.R4[Coll[Long]].get(1) == serviceFeePercent,
        inactiveRaffle.R4[Coll[Long]].get(2) == implementerFeePercent,
        inactiveRaffle.R4[Coll[Long]].get(0) + serviceFeePercent + implementerFeePercent < 1000L,
        inactiveRaffle.R4[Coll[Long]].get(3) > 0L,
        inactiveRaffle.R4[Coll[Long]].get(6) == txFee,
        inactiveRaffle.R5[Coll[Coll[Byte]]].get.size == 3,
        inactiveRaffle.R5[Coll[Coll[Byte]]].get(0) == serviceFeeErgoTreeHash,
        inactiveRaffle.R5[Coll[Coll[Byte]]].get(1) == blake2b256(implementerErgoTree),
        inactiveRaffle.R5[Coll[Coll[Byte]]].get(2) == blake2b256(creatorErgoTree),
        inactiveRaffle.R6[Coll[Coll[Byte]]].get.size >= 2,
        inactiveRaffle.R7[Coll[Coll[Byte]]].get(0) == SELF.id, // Storing TicketId to match with TicketRepo
        inactiveRaffle.R7[Coll[Coll[Byte]]].get(1) == blake2b256(winnersPercentBytes),
        inactiveRaffle.R8[Int].get == winnersCount,
        inactiveRaffle.value >= (5 * txFee * winnersCount) + (8 * txFee),
        inactiveRaffle.value >= creationFee,

        // Transaction constraints
        winnerPercentsSum == 1000L,
        hasStolenTickets == false,
        raffleGoal * serviceFeePercent > 0L,
        raffleGoal * implementerFeePercent > 0L,
        raffleGoal * projectPercent > 0L,
      )))
    } else {
      sigmaProp(false)
    }
  }
}
