import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

// import { Proxy } from '../../../types'
import { HFunds, HUniswapV2 } from '../../../types'

// npx hardhat --network avalanche deploy:handlers-polygon
task('deploy:handlers-avalanche')
  .setAction(async function (taskArguments: any, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()

    const HFundsFactory = await ethers.getContractFactory('contracts/handlers/funds/HFunds.sol:HFunds')
    const HUniswapV2Factory = await ethers.getContractFactory('contracts/handlers/uniswapv2/HUniswapV2.sol:HUniswapV2')

    HFundsFactory.connect(signers[0])
    HUniswapV2Factory.connect(signers[0])

    // 0x0ce7df36
    // 000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000b31f66aa3c1e785363f0875a1b74e27b85fd66c70000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000002386f26fc10000

    const hFunds: HFunds = <HFunds>await HFundsFactory.deploy()
    // Trader Joe
    // https://snowtrace.io/address/0x60ae616a2155ee3d9a68541ba4544862310933d4
    const hUniswapV2: HUniswapV2 = <HUniswapV2>await HUniswapV2Factory.deploy('0x60ae616a2155ee3d9a68541ba4544862310933d4')
    console.log(hUniswapV2.deployTransaction)

    await hFunds.deployed()
    await hUniswapV2.deployed()

    console.log('hFunds deployed to: ', hFunds.address)
    console.log('hUniswapV2 deployed to: ', hUniswapV2.address)
  })
