{
  // ErgoRaffle V2 Ticket Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: [DonatorErgoTreeHash]
  //   R5[Coll[Long]]: [RangeStart, RangeEnd, TicketPrice, Deadline]
  // Tokens:
  //   0: Ticket
  // Context (ticket redeem):
  //   0: Coll[Byte]: DonatorErgoTree
  //
  // Spent in 2 transactions:
  //   - Ticket redeem
  //      [TicketRedeem, Ticket] --> [TicketRedeem, redeemedDonation]
  //   - Owner ticket collection with TicketCollectorNFT
  //      [TicketCollector, Ticket] --> [TicketCollector]
  //
  // Involved in 2 transactions as data input:
  //   - Gift unwrap
  //      [WinnerPrize, Gift] + [(DataInput)Ticket] --> [WinnerPrize, unwrappedGift]
  //   - Winner Reward
  //      [WinnerPrize] + [(DataInput)Ticket] --> [finalPrize]
  //
  
  val ticketRedeemScriptHash = fromBase64("TICKET_REDEEM_SCRIPT_HASH_B64")
  val safePayScriptHash = fromBase64("SAFE_PAY_SCRIPT_HASH_B64")
  val raffleLicense = fromBase64("RAFFLE_LICENSE_B64")
  val ticketCollectorNft =  fromBase64("TICKET_COLLECTOR_NFT_B64")
  val expirationHeight = TICKET_EXPIRATION_HEIGHT

  if(OUTPUTS(0).tokens(0)._1 == ticketCollectorNft) {
    // Owner ticket collection with TicketCollectorNFT
    // [TicketCollector, Ticket] --> [TicketCollector]
    val deadline = SELF.R5[Coll[Long]].get(3)
    sigmaProp(HEIGHT > deadline + expirationHeight)
  } else {
    // Ticket redeem
    // [TicketRedeem, Ticket] --> [TicketRedeem, redeemedDonation]
    val ticketRedeem = INPUTS(0)
    val safePayBox = OUTPUTS(1)
    val ticketPrice = SELF.R5[Coll[Long]].get(2)
    val ticketCount = SELF.tokens(0)._2
    val txFee = ticketRedeem.R4[Coll[Long]].get(2)
    val isErgGoal = ticketRedeem.tokens.size == 2
    val redeemedDonation = if(isErgGoal){
      safePayBox.value == SELF.value + ticketPrice * ticketCount - txFee
    } else {
      safePayBox.value == SELF.value - txFee &&
      safePayBox.tokens(0)._1 == ticketRedeem.tokens(2)._1 &&
      safePayBox.tokens(0)._2 == ticketPrice * ticketCount
    }
    sigmaProp(allOf(Coll(
      // Correct Ticket Redeem format
      blake2b256(ticketRedeem.propositionBytes) == ticketRedeemScriptHash,
      ticketRedeem.tokens(0)._1 == raffleLicense,
      ticketRedeem.tokens(1)._1 == SELF.tokens(0)._1,

      // Correct Safe Pay format
      blake2b256(safePayBox.propositionBytes) == safePayScriptHash,
      safePayBox.R4[Coll[Byte]] == SELF.R4[Coll[Byte]],
      safePayBox.R5[Long].get == txFee,
      blake2b256(getVar[Coll[Byte]](0).get) == SELF.R4[Coll[Byte]].get,
      redeemedDonation,

      // Transaction constraints
      INPUTS(1).id == SELF.id, // prevent spending multiple tickets
    )))
  }
}
