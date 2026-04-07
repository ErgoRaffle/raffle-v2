{
  // ErgoRaffle V2 Raffle Creation Proxy Contract
  //
  // Tokens:
  //   0: CollectingToken (optional)
  //
  // Registers:
  //   R4: Coll[Long] = [
  //         expirationHeight,
  //         raffleDeadline,
  //         winnersPercent,
  //         ticketPrice,
  //         goal,
  //         txFee,
  //       ]
  //
  //   R5: Coll[Coll[Byte]] = [
  //         implementerErgoTreeHash,
  //         organizerErgoTreeHash,
  //         projectErgoTreeHash,
  //         winnersPercentListHash,
  //       ]
  //
  //   R6: Coll[Coll[Byte]] = [
  //         name,
  //         description,
  //         tags,
  //         pictures (optional, from index 3 onward)
  //       ]
  //
  //   R7: Int = winnersCount
  //
  // Context:
  //   C0: Coll[Long]: WinnersPercentList (in raffle creation tx)
  //   C1: Coll[Coll[Byte]]: [ImplementerErgoTree, OrganizerErgoTree, ProjectErgoTree]
  //
  // Spent in 2 transactions:
  //   - New raffle creation
  //      [Service, Proxy] --> [Service, TicketRepo, InactiveRaffle, Change]
  //   - Proxy redeem
  //      [Proxy] --> [UserAddress]

  // Setup parameters
  val serviceNft = fromBase64("SERVICE_NFT_B64")
  val raffleLicense = fromBase64("RAFFLE_LICENSE_B64")
  val expirationHeight = SELF.R4[Coll[Long]].get(0)

  // User parameters
  val raffleDeadline = SELF.R4[Coll[Long]].get(1)
  val winnersPercent = SELF.R4[Coll[Long]].get(2)
  val ticketPrice = SELF.R4[Coll[Long]].get(3)
  val goal = SELF.R4[Coll[Long]].get(4)
  val txFee = SELF.R4[Coll[Long]].get(5)

  val implementerErgoTreeHash = SELF.R5[Coll[Coll[Byte]]].get(0)
  val organizerErgoTreeHash = SELF.R5[Coll[Coll[Byte]]].get(1)
  val projectErgoTreeHash = SELF.R5[Coll[Coll[Byte]]].get(2)
  val winnersPercentListHash = SELF.R5[Coll[Coll[Byte]]].get(3)

  val winnersCount = SELF.R7[Int].get


  if(HEIGHT < expirationHeight && HEIGHT < raffleDeadline) {  
    // New raffle creation
    // [Service, Proxy] --> [Service, TicketRepo, InactiveRaffle, Change]
    val service = INPUTS(0)
    val inactiveRaffle = OUTPUTS(2)
    sigmaProp(allOf(Coll(
      // Correct Service format
      service.tokens(0)._1 == serviceNft,
      service.tokens(1)._1 == raffleLicense,

      // Correct InactiveRaffle format
      // R4: [WinnersPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, Deadline, TxFee]
      // R5: [ServiceErgoTreeHash, ImplementerErgoTreeHash, ProjectErgoTreeHash]
      // R6: [Name, Description, Pictures(optional)]
      // R7: [TicketId, WinnersPercentListHash]
      // R8: WinnersCount
      inactiveRaffle.tokens(0)._1 == raffleLicense,
      inactiveRaffle.R4[Coll[Long]].get(0) == winnersPercent,
      inactiveRaffle.R4[Coll[Long]].get(3) == ticketPrice,
      inactiveRaffle.R4[Coll[Long]].get(4) == goal,
      inactiveRaffle.R4[Coll[Long]].get(5) == raffleDeadline,
      inactiveRaffle.R5[Coll[Coll[Byte]]].get(1) == implementerErgoTreeHash,
      inactiveRaffle.R5[Coll[Coll[Byte]]].get(2) == projectErgoTreeHash,
      inactiveRaffle.R6[Coll[Coll[Byte]]].get == SELF.R6[Coll[Coll[Byte]]].get,
      inactiveRaffle.R7[Coll[Coll[Byte]]].get(1) == winnersPercentListHash,
      inactiveRaffle.R8[Int].get == winnersCount,
      if(SELF.tokens.size >= 1){
        inactiveRaffle.tokens(1) == SELF.tokens(0)
      } else { true },
    )))
  } else {
    // Proxy redeem
    // [Proxy] --> [UserAddress]
    sigmaProp(allOf(Coll(
      INPUTS(0).id == SELF.id,
      blake2b256(OUTPUTS(0).propositionBytes) == organizerErgoTreeHash,
      OUTPUTS(0).tokens == SELF.tokens,
      OUTPUTS(0).value >= INPUTS(0).value - txFee,
    )))
  }
}
