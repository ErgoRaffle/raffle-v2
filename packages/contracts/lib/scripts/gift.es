{
  // ErgoRaffle V2 Gift Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: [DonatorAddress]
  //   R5[Coll[Long]]: [WinnerIndex]
  // Tokens:
  //   0: GiftToken
  //   1: Gift
  //
  // Spent in 4 transactions:
  //   - Gift unwrap
  //      [Ticket, WinnerPrize, Gift] --> [Ticket, WinnerPrize, UserBox]
  //   - Gift redeem (for failed raffle) 
  //      [Winner, Gift] + [(DataInput)GiftRedeem] --> [Winner, UserBox]
  //
  sigmaProp(true)
}
