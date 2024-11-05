{
  // ErgoRaffle V2 Safe Pay Contract
  //
  // Registers:
  //   R4[Coll[Byte]]: Receiver Address Hash
  //   R5[Long]: TxFee
  //
  // Spent in 1 transaction:
  //   - Sending funds to receiver address
  //      [safePay] --> [UserBox]
  // 

  val receiverAddressHash = SELF.R4[Coll[Byte]].get
  val txFee = SELF.R5[Long].get
  // Sending funds to receiver address
  // [safePay] --> [UserBox]
  val receiverBox = OUTPUTS(0)
  sigmaProp(allOf(Coll(
    blake2b256(receiverBox.propositionBytes) == receiverAddressHash,
    receiverBox.value >= SELF.value - txFee,
    receiverBox.tokens == SELF.tokens,
    SELF.id == INPUTS(0).id,
  )))
}
