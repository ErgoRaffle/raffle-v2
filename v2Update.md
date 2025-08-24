# ErgoRaffle

ErgoRaffle is a crowdfunding platform built on the Ergo blockchain, designed to facilitate fundraising with an added lottery component. In version 1, a Raffle has a deadline and a set fundraising goal; if the Raffle reaches this goal within its deadline, the Raffle is successful, and the project, winner, and service will be paid accordingly. Otherwise, the Raffle is unsuccessful, and all collected funds will be returned to the raffle participants. If the Raffle achieves its goal before the deadline, it will continue operating till the deadline and can be overfunded.

### V1 Procedure

The V1 procedure can be simplified into three steps:

- **Creation**: The raffle creator starts a raffle by setting parameters (winner percentage, deadline, goal, ticket price)​.
- **Fundraising**: Participants buy raffle tickets until the deadline​.
- **End**:
  - **Successful Raffle**: If the raffle meets its goal, a winner is selected using a pseudo-random number derived from oracle data, and the raised funds are divided among the project, the winner and the service fee according to predefined proportions​​.
  - **Failed Raffle**: If the raffle does not meet its goal, the raffle refunds the donations to each participant by returning the funds to the participants' addresses​​.

## ErgoRaffle V2

In ErgoRaffle V2, several new features have been integrated that make the ErgoRaffle platform more versatile and attractive for various fundraising and gaming applications:

- **Supporting Tokens**: The raffle creator can choose which token to use for fundraising. For example, a project can set their goal in rsBTC instead of ERG​​​​.
- **Winner Baskets**: The platform now supports multiple winners instead of just one. A portion of the total raised funds goes into a "winner pot," and each winner receives a basket containing their share of this pot. Basket shares of winner pot are determined when the raffle is created, and each winner is selected using different random seeds from oracle data. A raffle can have up to 1000 winner baskets with shares from the winner pot​​.
- **Additional Gifts**: Anyone can add gifts to winner baskets during the raffle's fundraising period. These gifts can include NFTs, tokens, or a set of them​​.
- **Empty Baskets**: Beyond the baskets with winners pot share, raffles can have up to 5000 additional empty baskets. All baskets start with no gifts, but anyone can add gifts to any basket during the fundraising period. This allows for dynamic gift distribution beyond the main winner prizes.
- **NFT Marketplace**: The platform can function as an NFT/RWA marketplace through raffles. An NFT holder can create a raffle where the goal is to raise funds equal to the NFT's value. They start with an empty winner basket and add the NFT as a gift. If the fundraising goal is met, the winner receives the NFT along with any other gifts in their basket.
- **Implementor Fee**: Other services can use the ErgoRaffle infrastructure to implement new games or use cases, allowing the implementor to have a share of the raised funds​​.
- **Creation Fee**: A fee is charged when creating a raffle. If the raffle ends successfully, this fee is refunded to the raffle creator (excluding transaction fees).

### V2 Procedure

The V2 procedure includes the same initial steps as V1, with additional features:

- **Creation**: The raffle creator sets up the raffle by defining parameters, including the type of fundraising token, number of winners and winner shares.
- **Fundraising**:
  - Participants buy raffle tickets using the chosen fundraising token until the deadline.
  - Additional rewards can be added as gifts to raffle winners.
- **End**:
  - **Successful Raffle**: Multiple winners are selected using different random seeds initiated by oracle data. Finally, funds are distributed among the project, the winners, the raffle service and the implementor (if applicable). Additional gifts are awarded to the winners as specified.
  - **Failed Raffle**: If the raffle does not meet its goal, all donations are refunded to the participants, and any additional gifts are returned.
