{
  // ErgoRaffle V2 Winner Contract
  //
  // Registers:
  //   R4[Coll[Long]]: [WinnerIndex, RewardPercent, DeadlineTimestamp, txFee]
  //   R5[Long]: GiftCount
  //   R6[Coll[Byte]]: GiftTokenId
  // Tokens:
  //   0: Ticket
  //   1: GiftToken
  //
  // Spent in 5 transactions:
  //   - Winner box gift token receipt
  //      [Winner, GiftTokenRepo] --> [Winner, GiftTokenRepo(optional)]
  //   - New gift creation
  //      [Winner, UserBox] --> [Winner, Gift]
  //   - Winner prize creation (for successfully ended raffle) 
  //      [SuccessRaffle, Winner] --> [SuccessRaffle, WinnerPrize]
  //   - Gift redeem (for failed raffle) 
  //      [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, UserBox]
  //   - Winner box removal (for failed raffle)
  //      [GiftRedeem, Winner] --> [GiftRedeem]
  //
    sigmaProp(true)
}
