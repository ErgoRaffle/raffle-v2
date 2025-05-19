# Raffle V2

A decentralized raffle system on the Ergo blockchain that supports multiple winners, various prize types, and dynamic gift donations. This is the second iteration of the ErgoRaffle project, building upon the success of the first version while adding substantial new features and improvements.

## New Features

- **Multiple Winners**: Support for raffles with multiple winning positions and customizable prize shares
- **Flexible Token Support**: Funds can be collected in any token type
- **Dynamic Gift System**:
  - Anyone can donate additional gifts to winners while the raffle is active
  - Gifts are distributed automatically to winners or refunded to donors if the raffle fails
- **Service Fee Structure**:
  - Mandatory service fee at raffle creation (refunded to the creator if the raffle is successful)
  - Fair distribution between service providers and implementers

## Raffle Lifecycle

### 1. Creation Phase

As a raffle creator, you start a new raffle by providing a creation fee and specifying key parameters:

- Collecting Token
- Number of winners
- Deadline
- Ticket price
- Prize distribution rules

Once you submit these details, the service automatically handles all technical steps: it issues the necessary tokens, creates the raffle, and prepares the system for participants.

### 2. Active Phase

While the raffle is active, any user can participate in two main ways:

- Participate in the raffle by buying tickets. Each donation creates a ticket box with ticket tokens that represent participation shares.
- Donate extra gifts to winners. Gifts can be any token type (ERG, tokens, or NFTs), and each gift is assigned to a specific winning position. For example, an artist might add an NFT as a gift for the second-place winner in the raffle.

Raffle will stay active until the deadline, regardless of whether it reaches the funding goal or not.

### 3. Successful Completion

When the raffle succeeds:

- The system selects winners
- Creates prize distribution boxes
- Handles service fee allocation
- Sends the collected funds to the raffle creator
- Winners receive:
  - Their main prize share
  - Any additional donated gifts

### 4. Failed Raffle Handling

If the raffle fails, the system initiates the refund process:

- Returns donations to participants
- Returns gifts to the original donors
- Refunds the service fee
