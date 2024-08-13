{
  // ErgoRaffle V2 Active Raffle Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [ProjectPercent, ServiceFeePercent, ImplementerFeePercent, TicketPrice, Goal, DeadlineTimestamp, WinnersCount, txFee]
  //   R5[Coll[Coll[Byte]]]: [ServiceAddressHash, ImplementerAddressHash, CreatorAddressHash]
  //   R6[Long]: TotalSoldTickets
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  //
  // Spent in 3 transactions:
  //   - Donation
  //      [ActiveRaffle, UserBox] --> [ActiveRaffle, Ticket]
  //   - Successful end
  //      [ActiveRaffle, RaffleDetail] + [(DataInput)Oracle] --> [SuccessRaffle, ProjectFund, ServiceFee, ImplementerFee]
  //   - Failure end
  //      [ActiveRaffle, RaffleDetail] --> [GiftRedeem]
  // 
  val oracleTokenId = fromBase64("ORACLE_TOKEN_ID_B64")
  val successRaffleScriptHash = fromBase64("SUCCESS_RAFFLE_SCRIPT_HASH_B64")
  val giftRedeemScriptHash = fromBase64("GIFT_REDEEM_SCRIPT_HASH_B64")
  val ticketScriptHash = fromBase64("TICKET_SCRIPT_HASH_B64")

  val ticketPrice = SELF.R4[Coll[Long]].get(3)
  val goal = SELF.R4[Coll[Long]].get(4)
  val deadline = SELF.R4[Coll[Long]].get(5)
  val txFee = SELF.R4[Coll[Long]].get(7)
  val isErgGoal = (SELF.tokens.size == 2)
  val totalSoldTickets = SELF.R6[Long].get
  val totalRaised = ticketPrice * totalSoldTickets

  if(HEIGHT < deadline){
    // Donation
    // [ActiveRaffle, UserBox] --> [ActiveRaffle, Ticket]
    val outputRaffle = OUTPUTS(0)
    val ticket = OUTPUTS(1)
    val onSaleTickets = ticket.tokens(0)._2
    val depositTicketPrice = if(isErgGoal) {
      outputRaffle.value >= SELF.value + ticketPrice * onSaleTickets
    } else {
      outputRaffle.tokens(2)._1 == SELF.tokens(2)._1 &&
      outputRaffle.tokens(2)._2 >= SELF.tokens(2)._2 + ticketPrice * onSaleTickets
    }
    sigmaProp(allOf(Coll(
      // Correct ActiveRaffle format
      outputRaffle.propositionBytes == SELF.propositionBytes,
      outputRaffle.tokens(0)._1 == SELF.tokens(0)._1,
      outputRaffle.tokens(1)._1 == SELF.tokens(1)._1,
      outputRaffle.tokens(1)._2 == SELF.tokens(1)._2 - onSaleTickets,
      outputRaffle.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      outputRaffle.R5[Coll[Coll[Byte]]].get == SELF.R5[Coll[Coll[Byte]]].get,
      outputRaffle.R6[Long].get = totalSoldTickets + onSaleTickets,
      outputRaffle.value >= SELF.value,
      outputRaffle.tokens.size == SELF.tokens.size,
      depositTicketPrice,

      // Correct Ticket format
      // R4: [DonatorAddress]
      // R5: [RangeStart, RangeEnd, TicketPrice]
      blake2b256(ticket.propositionBytes) == ticketScriptHash,
      ticket.value >= 2 * txFee,
      ticket.tokens(0)._1 == SELF.tokens(1)._1,
      ticket.R5[Coll[Long]].get = Coll[Long](
        totalSoldTickets, 
        totalSoldTickets + onSaleTickets, 
        ticketPrice
      ),
    )))
  } else if (totalRaised >= goal) {
    // Successful end
    // [ActiveRaffle, RaffleDetail] + [(DataInput)Oracle] --> [SuccessRaffle, ProjectFund, ServiceFee, ImplementerFee]
    val successRaffle = OUTPUTS(0)
    val projectFund = OUTPUTS(1)
    val serviceFee = OUTPUTS(2)
    val implementerFee = OUTPUTS(3)
    val oracleBox = CONTEXT.dataInputs(0)
    val projectPercent = SELF.R4[Coll[Long]].get(0)
    val serviceFeePercent = SELF.R4[Coll[Long]].get(1)
    val implementerFeePercent = SELF.R4[Coll[Long]].get(2)
    val winnersPercent = 100 - projectPercent - serviceFeePercent - implementerFeePercent
    val winnersCount = SELF.R4[Coll[Long]].get(6)
    val splittingRaisedFund = if(isErgGoal) { 
      successRaffle.value == (totalRaised * winnersPercent) / 100 + txFee &&
      serviceFee.value == (totalRaised * serviceFeePercent) / 100 + txFee &&
      implementerFee.value == (totalRaised * implementerFeePercent) / 100 + txFee &&
      projectFund.value >= 
        SELF.value - successRaffle.value - serviceFee.value - implementerFee.value
    } else {
      successRaffle.tokens(2)._1 == SELF.tokens(2)._1 &&
      projectFund.tokens(0)._1 == SELF.tokens(2)._1 &&
      serviceFee.tokens(0)._1 == SELF.tokens(2)._1 &&
      implementerFee.tokens(0)._1 == SELF.tokens(2)._1 &&
      successRaffle.tokens(2)._2 == (totalRaised * winnersPercent) / 100 + 1 &&
      projectFund.tokens(0)._2 >= (totalRaised * projectPercent) / 100 &&
      serviceFee.tokens(0)._2 == (totalRaised * serviceFeePercent) / 100 &&
      implementerFee.tokens(0)._2 == (totalRaised * implementerFeePercent) / 100 &&
      successRaffle.value == txFee &&
      projectFund.value == SELF.value - 3 * txFee &&
      serviceFee.value == txFee &&
      implementerFee.value == txFee
    }
    sigmaProp(allOf(Coll(
      // Correct Oracle box
      oracleBox.tokens(0)._1 == oracleTokenId,
      oracleBox.creationInfo._1 > deadline,

      // Correct SuccessRaffle format
      // R4: [WinnersCount, TotalPrize]
      // R5: [Seed, SelectedWinnersListHash]
      // R6: Step
      blake2b256(successRaffle.propositionBytes) == successRaffleScriptHash,
      successRaffle.tokens(0)._1 == SELF.tokens(0)._1,
      successRaffle.tokens(1)._1 == SELF.tokens(1)._1,
      successRaffle.tokens(1)._2 == SELF.tokens(1)._2 + 1,
      successRaffle.tokens.size == SELF.tokens.size,
      successRaffle.R4[Coll[Long]].get = Coll[Long](
        winnersCount, 
        totalRaised * winnersPercent / 100,
        totalSoldTickets
      ),
      successRaffle.R5[Coll[Coll[Byte]]].get(0) == oracleBox.id.slice(0, 15),
      successRaffle.R5[Coll[Coll[Byte]]].get(1) == blake2b256(Coll[Byte]()),
      successRaffle.R6[Long].get == 1,

      // Transaction constraints
      splittingRaisedFund,
    )))
  } else {
    // Failure end
    // [ActiveRaffle, RaffleDetail] --> [GiftRedeem]
    val giftRedeem = OUTPUTS(0)
    val collectingTokenCheck = if(isErgGoal) { true } else {
      giftRedeem.tokens(2)._1 == SELF.tokens(2)._1 &&
      giftRedeem.tokens(2)._2 == SELF.tokens(2)._2 &&
    }
    sigmaProp(allOf(Coll(
      // Correct GiftRedeem format
      // R4: [TotalSoldTicket, TicketPrice, WinnersCount, txFee]
      // R5: Step
      blake2b256(giftRedeem.propositionBytes) == giftRedeemScriptHash,
      giftRedeem.value == SELF.value,
      giftRedeem.tokens(0)._1 == SELF.tokens(0)._1,
      giftRedeem.tokens(1)._1 == SELF.tokens(1)._1,
      giftRedeem.tokens(1)._2 == SELF.tokens(1)._2 + 1,
      collectingTokenCheck,
      giftRedeem.tokens.size == SELF.tokens.size,
      giftRedeem.R4[Coll[Long]].get = Coll[Long](
        totalSoldTickets, 
        ticketPrice, 
        winnersCount,
        txFee
      ),
      giftRedeem.R5[Long].get == 1,
    )))
  }
}
