{
  // ErgoRaffle V2 Service Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [ServiceFeePercent, ImplementerFeePercent, CreationFee, TxFee]
  //   R5[Coll[Coll[Byte]]]: [OwnerAddress]
  // Tokens:
  //   0: ServiceNft
  //   1: RaffleLicense
  // Context:
  //   C0: Coll[Long]: WinnersPercentList (in raffle creation tx)
  //
  // Spent in 3 transactions:
  //   - Owner config update with OwnerNft
  //   - RaffleLicense redeem from SuccessRaffle or TicketRedeem
  //      [Service, (SuccessRaffle | TicketRedeem)] --> [Service]
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
    val serviceNft = SELF.tokens(0)._1
    val raffleLicense = SELF.tokens(1)._1
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
      // RaffleLicense redeem from SuccessRaffle or TicketRedeem
      // [Service, (SuccessRaffle | TicketRedeem)] --> [Service]
      sigmaProp(selfReplication)
    } else if (outputService.tokens(1)._2 == SELF.tokens(1)._2 - 1L) {
      // New raffle creation
      // [Service, UserBox] --> [Service, TicketRepo, InactiveRaffle, Change]
      val winnersPercent = getVar[Coll[Long]](0).get
      val winnersPercentBytes = winnersPercent.fold(
        Coll[Byte](), 
        {(res: Coll[Byte], p: Long) => res ++ longToByteArray(p)}
      )
      val winnerPercentsSum = winnersPercent.fold(0L, {(x: Long, y: Long) => x + y})
      val winnersCount = winnersPercent.size
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
      val serviceAddress = SELF.R5[Coll[Coll[Byte]]].get(0)

      sigmaProp(allOf(Coll(
        // Correct Service format
        selfReplication,

        // Correct TicketRepo format
        blake2b256(ticketRepo.propositionBytes) == ticketRepoScriptHash,
        ticketRepo.tokens(0)._1 == SELF.id,
        ticketRepo.tokens.size == 1, // Not to steal tickets
        ticketRepo.value == txFee,

        // Correct InactiveRaffle format
        // R4: [CharityPercentage, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, DeadlineTimestamp, TotalSoldTicket, WinnersCount, TxFee]
        // R5: [ServiceAddress, ImplementerAddress, CharityAddress]
        // R6: [Name, Description, Pictures(optional)]
        // R7: [TicketId, WinnersPercentListHash]
        blake2b256(inactiveRaffle.propositionBytes) == inactiveRaffleScriptHash,
        inactiveRaffle.tokens(0)._1 == raffleLicense,
        inactiveRaffle.R4[Coll[Long]].get.size == 9,
        inactiveRaffle.R4[Coll[Long]].get(0) > 0L,
        inactiveRaffle.R4[Coll[Long]].get(1) == serviceFeePercent,
        inactiveRaffle.R4[Coll[Long]].get(2) == implementerFeePercent,
        inactiveRaffle.R4[Coll[Long]].get(0) + serviceFeePercent + implementerFeePercent <= 100L,
        inactiveRaffle.R4[Coll[Long]].get(6) == 0L, // No sold ticket at beginning
        inactiveRaffle.R4[Coll[Long]].get(7) == winnersCount,
        inactiveRaffle.R4[Coll[Long]].get(8) == txFee,
        inactiveRaffle.R5[Coll[Coll[Byte]]].get.size == 3,
        inactiveRaffle.R5[Coll[Coll[Byte]]].get(0) == serviceAddress,
        inactiveRaffle.R6[Coll[Coll[Byte]]].get.size >= 2,
        inactiveRaffle.R7[Coll[Coll[Byte]]].get(0) == SELF.id, // Storing TicketId to match with TicketRepo
        inactiveRaffle.R7[Coll[Coll[Byte]]].get(1) == blake2b256(winnersPercentBytes),
        inactiveRaffle.value >= (4 * txFee * winnersCount) + creationFee,

        // Transaction constraints
        winnerPercentsSum == 1000L,
        hasStolenTickets == false,
      )))
    } else {
      sigmaProp(false)
    }
  }
}
