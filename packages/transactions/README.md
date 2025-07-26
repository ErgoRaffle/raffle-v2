# transactions

## Table of contents

- [Introduction](#introduction)
- [Usage](#usage)
- [Installation](#installation)

## Introduction

The `@ergo-raffle/transactions` package provides a comprehensive set of transaction builders for the Ergo Raffle protocol. It enables developers to programmatically construct, configure, and manage all transaction types required for the lifecycle of a decentralized raffle on the Ergo blockchain.

This package includes builders for creating, activating, and finalizing raffles, as well as handling ticket sales, prize distribution, gift management, and more. Each builder abstracts the complexity of constructing Ergo transactions, allowing you to focus on your raffle logic while ensuring protocol compliance.

## Usage

Import the transaction builder you need from the package. Each builder allows you to fluently set the required parameters and then call `.build()` to generate an unsigned Ergo transaction.

```ts
import { CreationTxBuilder } from '@ergo-raffle/transactions';
// You can also import other builders as needed, e.g. ActivationTxBuilder, DonateTxBuilder, etc.

// Example: Creating a raffle creation transaction
const builder = new CreationTxBuilder()
  .setServiceBox(serviceBox) // required input box
  .setFeeBoxes([feeBox1, feeBox2]) // input boxes to cover transaction fees
  .setCreatorAddress(creatorAddress) // base58 address
  .setImplementerAddress(implementerAddress)
  .setWinnersCount(3)
  .setDeadline(BigInt(12345678))
  .setWinnersPercent([BigInt(500), BigInt(300), BigInt(200)])
  .setTicketPrice(BigInt(1000000000)) // 1 ERG in nanoERG
  .setGoal(BigInt(10000000000)) // 10 ERG in nanoERG
  .setInactiveRaffleValue(BigInt(5000000))
  .setChainHeight(123456)
  .setTxFee(BigInt(1000000))
  .setRaffleName('My Raffle')
  .setRaffleDescription('A sample decentralized raffle')
  .setTicketTokenCount(BigInt(100));
// ...set other parameters as needed
// Build the unsigned transaction
const unsignedTx = builder.build();
```

**Note:**

- You must provide all required boxes and parameters for the specific transaction type. The builder throws error if any required parameter was missed.
- The returned `unsignedTx` is an instance of `ErgoUnsignedTransaction` (from `@fleet-sdk/core`), ready to be signed and submitted to the Ergo blockchain.
- For more details on each builder and parameter, see the source code.

## Installation

npm:

```sh
npm i @ergo-raffle/transactions
```

yarn:

```sh
yarn add @ergo-raffle/transactions
```
