{
  // ErgoRaffle V2 Gift Token Repo Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: TokenName
  //   R5[Coll[Byte]]: TokenDescription
  //   R6[Coll[Byte]]: Decimals (0)
  //   R7[Coll[Int]]: [GiftTokenCount, WinnersCount, txFee]
  //   R8[Coll[Byte]]: TicketId
  //   R9[Int]: Step
  // Tokens:
  //   0: GiftToken
  //
  // Spent in 1 transaction:
  //   - Winner box gift token receipt
  //      [Winner, GiftTokenRepo] --> [Winner, GiftTokenRepo(optional)]
  //

  val outWinner = OUTPUTS(0)
  val outGiftTokenRepo = OUTPUTS(1)
  val giftTokenCount = SELF.R7[Coll[Int]].get(0)
  val winnersCount = SELF.R7[Coll[Int]].get(1)
  val txFee = SELF.R7[Coll[Int]].get(2)
  val ticketId = SELF.R8[Coll[Byte]].get
  val step = SELF.R9[Int].get
  val giftTokenRepoValidation = if(winnersCount > 1) {
    allOf(Coll(
      outGiftTokenRepo.R7[Coll[Int]].get == SELF.R7[Coll[Int]].get,
      outGiftTokenRepo.R8[Coll[Byte]].get == SELF.R8[Coll[Byte]].get,
      outGiftTokenRepo.tokens(0)._1 == SELF.tokens(0)._1,
      outGiftTokenRepo.tokens(0)._2 == SELF.tokens(0)._2 - giftTokenCount,
      outGiftTokenRepo.R9[Int].get == step + 1,
      outGiftTokenRepo.value >= SELF.value - txFee,
    ))
  } else {
    true
  }

  // Winner box gift token receipt
  // [Winner, GiftTokenRepo] --> [Winner, GiftTokenRepo(optional)]
  sigmaProp(allOf(Coll(
    // Correct Winner format
    outWinner.tokens(0)._1 == ticketId,
    outWinner.tokens(1)._1 == SELF.tokens(0)._1,
    outWinner.tokens(1)._2 == giftTokenCount,
    outWinner.R4[Coll[Long]].get(0) == step,

    // Correct GiftTokenRepo format
    giftTokenRepoValidation
  )))
}
