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
  sigmaProp(true)
}
