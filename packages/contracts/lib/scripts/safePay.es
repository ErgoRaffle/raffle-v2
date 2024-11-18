{
  // ErgoRaffle V2 Safe Pay Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: Receiver ErgoTree Hash
  //   R5[Long]: TxFee
  //
  // Spent in 1 transaction:
  //   - Sending funds to receiver ergo tree
  //      [safePay] --> [UserBox]
  // 

  val receiverErgoTreeHash = SELF.R4[Coll[Byte]].get
  val txFee = SELF.R5[Long].get
  // Sending funds to receiver ergo tree
  // [safePay] --> [UserBox]
  val receiverBox = OUTPUTS(0)
  sigmaProp(allOf(Coll(
    blake2b256(receiverBox.propositionBytes) == receiverErgoTreeHash,
    receiverBox.value >= SELF.value - txFee,
    receiverBox.tokens == SELF.tokens,
    SELF.id == INPUTS(0).id,
  )))
}
