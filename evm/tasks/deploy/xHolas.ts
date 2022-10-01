import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

import { XHolas, XHolas__factory } from '../../types'

interface TaskArguments {
  coreBridgeAddress: string,
  tokenBridgeAddress: string,
  wormholeChainId: number,
}

// Help: npx hardhat help deploy:xHolas
// Example: (addresses must be in lowercase)

// Mainnet
// npx hardhat --network ethereum deploy:xHolas --wormhole-chain-id 2 --core-bridge-address 0x706abc4e45d419950511e474c7b9ed348a4a716c --token-bridge-address 0xf890982f9310df57d00f659cf4fd87e65aded8d7

// npx hardhat --network polygon-mainnet deploy:xHolas --wormhole-chain-id 5 --core-bridge-address 0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7 --token-bridge-address 0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE
// npx hardhat --network avalanche deploy:xHolas --wormhole-chain-id 6 --core-bridge-address 0x54a8e5f9c4CbA08F9943965859F6c34eAF03E26c --token-bridge-address 0x0e082F06FF657D94310cB8cE8B0D9a04541d8052
// npx hardhat --network fantom deploy:xHolas --wormhole-chain-id 10 --core-bridge-address 0x126783A6Cb203a3E35344528B26ca3a0489a1485 --token-bridge-address 0x7C9Fc5741288cDFdD83CeB07f3ea7e22618D79D2

// Testnet
// npx hardhat --network goerli deploy:xHolas --wormhole-chain-id 2 --core-bridge-address 0x706abc4e45d419950511e474c7b9ed348a4a716c --token-bridge-address 0xf890982f9310df57d00f659cf4fd87e65aded8d7
// npx hardhat --network bsc deploy:xHolas --wormhole-chain-id 4 --core-bridge-address 0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D --token-bridge-address 0x9dcF9D205C9De35334D646BeE44b2D2859712A09
// npx hardhat --network polygon-mumbai deploy:xHolas --wormhole-chain-id 5 --core-bridge-address 0x0cbe91cf822c73c2315fb05100c2f714765d5c20 --token-bridge-address 0x377d55a7928c046e18eebb61977e714d2a76472a
task('deploy:xHolas')
  .addParam('wormholeChainId', 'Wormhole Chain ID')
  .addParam('coreBridgeAddress', 'Wormhole Core Bridge Address')
  .addParam('tokenBridgeAddress', 'Wormhole Token Bridge Address')
  .setAction(async function (taskArguments: TaskArguments, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()
    const xHolasFactory = await ethers.getContractFactory('contracts/xHolas.sol:xHolas')
    xHolasFactory.connect(signers[0])
    const xHolas: XHolas = <XHolas>await xHolasFactory.deploy(
      taskArguments.coreBridgeAddress,
      taskArguments.tokenBridgeAddress,
      taskArguments.wormholeChainId,
    )
    console.log(xHolas.deployTransaction)
    await xHolas.deployed()
    console.log('xHolas deployed to: ', xHolas.address)
  })
