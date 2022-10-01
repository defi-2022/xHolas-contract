# xHolas-contract

## Loom video describing contract flow
[https://www.loom.com/share/085d9fb87d394b8bb56f7c303ffe5af5](xHolas Contract Flow)

## Smart Contract Architecture
 <img src="https://github.com/xHolas-Pit/.github/blob/main/profile/xHolasDiagram.png?raw=true" width=1000>

 1. the frontend app receives user payload, aka a list of transactions they want to perform along with their parameters. 
   * ex) swap 25 $ETH to $USDC on Ethereum -> bridge output $USDC to Solana -> swap output $USDC to $WETH -> bridge $WETH back to $ETH Ethereum 

 2. the xHolas contract executes transactions in a loop through delegate calls

 4. each call gets routed to a handler contract based on the corresponding strategy (swap, bridge, borrow, lend)
 * for cross-chain txs, the remaining tx function names and parameters are encoded and sent over to the target chain as a Wormhole VAA payload to be executed at the target chain's receiving contract. 

## Deployment addresses 
Soon^TM
