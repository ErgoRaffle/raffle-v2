{
  // ErgoRaffle V2 Ticket Redeem Contract
  //
  // Registers:
  // Registers:
  //   R4[Coll[Long]]: [TotalSoldTicket, TicketPrice, txFee]
  //   R5[Long]: RedeemedTickets
  // Tokens:
  //   0: RaffleLicense
  //   1: Ticket
  //   2: CollectingToken (if token-goal raffle)
  // Context (license redeem):
  //   0: Coll[Byte]: ServiceErgoTree
  //
  // Spent in 2 transactions:
  //   - Ticket redeem
  //      [TicketRedeem, Ticket] --> [TicketRedeem, RedeemedDonation]
  //   - License redeem
  //      [Service, TicketRedeem] --> [Service, ServiceFee]
  // 
  
  val safePayScriptHash = fromBase64("SAFE_PAY_SCRIPT_HASH_B64")
  val serviceNft = fromBase64("SERVICE_NFT_B64")

  val totalSoldTickets = SELF.R4[Coll[Long]].get(0)
  val txFee = SELF.R4[Coll[Long]].get(2)
  val redeemedTickets = SELF.R5[Long].get
  val isErgGoal = SELF.tokens.size == 2
  if(redeemedTickets < totalSoldTickets){
    // Ticket redeem
    // [TicketRedeem, Ticket] --> [TicketRedeem, RedeemedDonation]
    val outTicketRedeem = OUTPUTS(0)
    val ticket = INPUTS(1)
    val ticketCount = ticket.tokens(0)._2
    val ticketPrice = SELF.R4[Coll[Long]].get(1)
    val validateTicketRedeemFund = if(isErgGoal) {
      outTicketRedeem.value >= SELF.value - ticketCount * ticketPrice
    } else {
      outTicketRedeem.value >= SELF.value &&
      outTicketRedeem.tokens(2)._1 == SELF.tokens(2)._1 &&
      outTicketRedeem.tokens(2)._2 >= SELF.tokens(2)._2 - ticketCount * ticketPrice
    }
    sigmaProp(allOf(Coll(true,
      // Correct Ticket Redeem format
      outTicketRedeem.propositionBytes == SELF.propositionBytes,
      outTicketRedeem.tokens(0) == SELF.tokens(0),
      outTicketRedeem.tokens(1)._1 == SELF.tokens(1)._1,
      outTicketRedeem.tokens(1)._2 == SELF.tokens(1)._2 + ticketCount,
      validateTicketRedeemFund,
      outTicketRedeem.R4[Coll[Long]].get == SELF.R4[Coll[Long]].get,
      outTicketRedeem.R5[Long].get == redeemedTickets + ticketCount,

      // Correct Ticket format
      ticket.tokens(0)._1 == SELF.tokens(1)._1,
    )))
  } else {
    // License redeem
    // [Service, TicketRedeem] --> [Service, ServiceFee]
    val service = INPUTS(0)
    val serviceFee = OUTPUTS(1)
    val serviceFeeErgoTreeHash = service.R5[Coll[Byte]].get
    sigmaProp(allOf(Coll(
      // Correct Service format
      service.tokens(0)._1 == serviceNft,
      service.tokens(1)._1 == SELF.tokens(0)._1,

      // Correct Service Fee format
      blake2b256(serviceFee.propositionBytes) == safePayScriptHash,
      serviceFee.value == SELF.value - txFee,
      serviceFee.R4[Coll[Byte]].get == serviceFeeErgoTreeHash,
      serviceFee.R5[Long].get == txFee,
      blake2b256(getVar[Coll[Byte]](0).get) == serviceFeeErgoTreeHash,
      if(!isErgGoal) serviceFee.tokens(0) == SELF.tokens(2) else true,

      // Transaction constraints
      SELF.id == INPUTS(1).id,
    )))
  }
}
