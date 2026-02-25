{
  // ErgoRaffle V2 Raffle Creation Proxy Contract
  //
  // Tokens:
  //   0: CollectingToken (optional)
  // Context:
  //   C0: Coll[Long]: WinnersPercentList (in raffle creation tx)
  //   C1: Coll[Coll[Byte]]: [ImplementerErgoTree, CreatorErgoTree]
  //
  // Spent in 2 transactions:
  //   - New raffle creation
  //      [Service, Proxy] --> [Service, TicketRepo, InactiveRaffle, Change]
  //   - Proxy redeem
  //      [Proxy] --> [UserAddress]
  // 

  // Contract parameters (to be filled from INPUTS(0) registers)
  // Correct SELF format
  // R4: Coll[Long] = [expirationHeight, winnersPercent, ticketPrice, goal, raffleDeadline, txFee, isErgGoal( 0 or 1 )]
  // R5: Coll[Coll[Byte]] = [serviceNft, raffleLicense, implementorErgoTreeHash, creatorErgoTreeHash, winnersPercentListHash, collectingTokenId (empty if ERG goal)]
  // R6: Coll[Coll[Byte]] = [name, description, Pictures(optional)]
  // R7: Int = winnerCount

  // Setup parameters
  val serviceNft = SELF.R5[Coll[Coll[Byte]]].get(0)
  val raffleLicense = SELF.R5[Coll[Coll[Byte]]].get(1)
  val expirationHeight = SELF.R4[Coll[Long]].get(0)

  // User parameters
  val winnersPercent = SELF.R4[Coll[Long]].get(1)
  val ticketPrice = SELF.R4[Coll[Long]].get(2)
  val goal = SELF.R4[Coll[Long]].get(3)
  val raffleDeadline = SELF.R4[Coll[Long]].get(4)
  val txFee = SELF.R4[Coll[Long]].get(5)
  val isErgGoal = SELF.R4[Coll[Long]].get(6) == 1

  val implementorErgoTreeHash = SELF.R5[Coll[Coll[Byte]]].get(2)
  val creatorErgoTreeHash = SELF.R5[Coll[Coll[Byte]]].get(3)
  val winnersPercentListHash = SELF.R5[Coll[Coll[Byte]]].get(4)
  val collectingTokenId = SELF.R5[Coll[Coll[Byte]]].get(5)

  val name = SELF.R6[Coll[Coll[Byte]]].get(0)
  val description = SELF.R6[Coll[Coll[Byte]]].get(1)
  // TODO: Fix pictures serialization and constraints
  // val pictures = SELF.R6[Coll[Coll[Byte]]].get(2)

  val winnerCount = SELF.R7[Int].get


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
      // R5: [ServiceErgoTreeHash, ImplementerErgoTreeHash, CreatorErgoTreeHash]
      // R6: [Name, Description, Pictures(optional)]
      // R7: [TicketId, WinnersPercentListHash]
      // R8: WinnersCount
      inactiveRaffle.tokens(0)._1 == raffleLicense,
      inactiveRaffle.R4[Coll[Long]].get(0) == winnersPercent,
      inactiveRaffle.R4[Coll[Long]].get(3) == ticketPrice,
      inactiveRaffle.R4[Coll[Long]].get(4) == goal,
      inactiveRaffle.R4[Coll[Long]].get(5) == raffleDeadline,
      inactiveRaffle.R5[Coll[Coll[Byte]]].get(1) == implementorErgoTreeHash,
      inactiveRaffle.R5[Coll[Coll[Byte]]].get(2) == creatorErgoTreeHash,
      inactiveRaffle.R6[Coll[Coll[Byte]]].get(0) == name,
      inactiveRaffle.R6[Coll[Coll[Byte]]].get(1) == description,
      // TODO: Fix pictures serialization and constraints
      // inactiveRaffle.R6[Coll[Coll[Byte]]].get.slice(2, inactiveRaffle.R6[Coll[Coll[Byte]]].get.size) == pictures,
      inactiveRaffle.R7[Coll[Coll[Byte]]].get(1) == winnersPercentListHash,
      inactiveRaffle.R8[Int].get == winnerCount,
      if(!isErgGoal){
        inactiveRaffle.tokens(1)._1 == collectingTokenId
      } else { true },
    )))
  } else {
    // Proxy redeem
    // [Proxy] --> [UserAddress]
    sigmaProp(allOf(Coll(
      INPUTS.size == 1,
      OUTPUTS.size == 2,
      blake2b256(OUTPUTS(0).propositionBytes) == creatorErgoTreeHash,
      OUTPUTS(0).tokens == SELF.tokens,
      OUTPUTS(1).value <= txFee,
    )))
  }
}
