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

  // Contract parameters (to be filled by generator)
  // Setup parameters
  val serviceNft = fromBase64("SERVICE_NFT_B64")
  val raffleLicense = fromBase64("RAFFLE_LICENSE_B64")
  val expirationHeight = EXPIRATION_HEIGHT
  
  // User parameters
  val name = fromBase64("NAME_B64")
  val description = fromBase64("DESCRIPTION_B64")
  // TODO: Fix pictures serialization and constraints
  // val pictures = fromBase64("PICTURES_B64")
  val ticketPrice = TICKET_PRICE
  val goal = GOAL
  val raffleDeadline = DEADLINE
  val winnerCount = WINNER_COUNT
  val winnersPercent = WINNERS_PERCENT
  val txFee = TX_FEE
  val creatorErgoTreeHash = fromBase64("CREATOR_ERGO_TREE_HASH_B64")
  val implementorErgoTreeHash = fromBase64("IMPLEMENTOR_ERGO_TREE_HASH_B64")
  val winnersPercentListHash = fromBase64("WINNERS_PERCENT_LIST_HASH_B64")
  val isErgGoal = IS_ERG_GOAL
  val collectingTokenId = fromBase64("COLLECTING_TOKEN_ID_B64") // Optional

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
