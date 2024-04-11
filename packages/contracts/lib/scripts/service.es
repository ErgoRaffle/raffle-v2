{
  // ErgoRaffle V2 Service Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [ServiceFeePercent, CreationFee]
  //   R5[Coll[Coll[Byte]]]: [OwnerAddress]
  // Tokens:
  //   0: ServiceNft
  //   1: RaffleLicense
  // Context:
  //   Coll[Long]: WinnersPercentList (in raffle creation tx)
  //
  // Spent in 3 transactions:
  //   - Owner config update with OwnerNft
  //   - RaffleLicense redeem from SucessRaffle or TicketRedeem
  //      [Service, (SuccessRaffle | TicketRedeem)] --> [Service]
  //   - New raffle creation
  //      [Service(Self), UserBox] --> [Service, TicketRepo, InactiveRaffle, Change]
  // 

  val ownerNft = fromBase64("OWNER_NFT")
  val serviceNft = fromBase64("SERVICE_NFT")
  val raffleLicense = fromBase64("RAFFLE_LICENSE") // TODO to be removed
  val inactiveRaffleScriptHash = fromBase64("INACTIVE_RAFFLE_SCRIPT_HASH")
  val ticketRepoScriptHash = fromBase64("TICKET_REPO_SCRIPT_HASH")
  val fee = FEE
  val minBoxValue = MIN_BOX_VALUE

  if (OUTPUTS(0).tokens(0)._1 == ownerNft) {
    // Owner can spend and update the service box with the owner nft
    sigmaProp(true)
  } else {
    val outputService = OUTPUTS(0)
    val selfReplication = allOf(Coll(
      outputService.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      outputService.R5[Coll[Coll[Byte]]].get == SELF.R5[Coll[Coll[Byte]]].get,
      outputService.propositionBytes == SELF.propositionBytes,
      outputService.tokens(0)._1 == serviceNft,
      outputService.tokens(1)._1 == raffleLicense,
      outputService.value >= SELF.value,
      outputService.tokens.size == SELF.tokens.size,
    ))
    if(outputService.tokens(1)._2 == SELF.tokens(1)._2 + 1L){
      // RaffleLicense redeem from SucessRaffle or TicketRedeem
      // [Service, (SuccessRaffle | TicketRedeem)] --> [Service]
      sigmaProp(selfReplication)
    } else if (outputService.tokens(1)._2 == SELF.tokens(1)._2 - 1L) {
      // New raffle creation
      // [Service(Self), UserBox] --> [Service, TicketRepo, InactiveRaffle, Change]
      val winnersPercent = getVar[Coll[Long]].get
      val winnersPercentBytes = winnersPercent.fold(
        Coll[Byte](), 
        (res: Coll[Byte], p: Long) => res ++ longToByteArray(p)
      )
      val winnerPercentsSum = winnersPercent.fold(0L, {(x: Long, y: Long) => x + y})
      val winnersCount = winnersPercent.size
      val hasStolenTickets = OUTPUTS.slice(2, OUTPUTS.size)
        .exists(
          (box: Box) => 
            box.tokens.exists((token: (Coll[Byte], Long)) => token._1 == SELF.id)
        )
      val ticketRepo = OUTPUTS(1)
      val inactiveRaffle = OUTPUTS(2)
      val serviceFeePercent = SELF.R4[Coll[Long]].get(0)
      val creationFee = SELF.R4[Coll[Long]].get(1)
      val serviceAddress = SELF.R5[Coll[Coll[Byte]]].get(0)

      sigmaProp(allOf(Coll(
        // Correct Service format
        selfReplication,

        // Correct TicketRepo format
        blake2b256(ticketRepo.propositionBytes) == ticketRepoScriptHash,
        ticketRepo.tokens(0)._1 == SELF.id,
        ticketRepo.tokens.size == 1, // Not to steal tickets
        ticketRepo.value == fee,

        // Correct InactiveRaffle format
        // R4: [CharityPercentage, ServiceFeePercent, TicketPrice, Goal, DeadlineTimestamp, TotalSoldTicket, WinnersCount, CreationFee]
        // R5: [ServiceAddress, CharityAddress]
        // R6: [Name, Description, Pictures(optional)]
        // R7: [TicketId, WinnersPercentListHash]
        blake2b256(inactiveRaffle.propositionBytes) == inactiveRaffleScriptHash,
        inactiveRaffle.tokens(0)._1 == raffleLicense,
        inactiveRaffle.R4[Coll[Long]].get.size == 8,
        inactiveRaffle.R4[Coll[Long]].get(0) > 0L,
        inactiveRaffle.R4[Coll[Long]].get(1) == serviceFeePercent,
        inactiveRaffle.R4[Coll[Long]].get(0) + inactiveRaffle.R4[Coll[Long]].get(1) <= 100L,
        inactiveRaffle.R4[Coll[Long]].get(5) == 0L, // No sold ticket at beginning
        inactiveRaffle.R4[Coll[Long]].get(6) == winnersCount,
        inactiveRaffle.R4[Coll[Long]].get(7) == creationFee,
        inactiveRaffle.R5[Coll[Coll[Byte]]].get.size == 2,
        inactiveRaffle.R5[Coll[Coll[Byte]]].get(0) == serviceAddress,
        inactiveRaffle.R6[Coll[Coll[Byte]]].get.size >= 2,
        inactiveRaffle.R7[Coll[Coll[Byte]]].get(0) == SELF.id, // Storing TicketId to match with TicketRepo
        inactiveRaffle.R7[Coll[Coll[Byte]]].get(1) == blake2b256(winnersPercentBytes),
        inactiveRaffle.value == (winnersCount * (fee + minBoxValue)) + ((2 * fee) + minBoxValue) + creationFee,

        // Transaction constraints
        winnerPercentsSum == 1000L,
        hasStolenTickets == false,
      )))
    } else {
      sigmaProp(false)
    }
  }
}
