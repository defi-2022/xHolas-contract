import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

// import { Proxy } from '../../../types'
// import { HFunds, HUniswapV2, HAaveProtocolV2 } from '../../../types'
import { HAaveProtocolV2 } from '../../../types'

// npx hardhat --network polygon-mainnet deploy:handlers-polygon
// task('deploy:handlers-polygon')
//   .setAction(async function (taskArguments: any, { ethers }) {
//     const signers: SignerWithAddress[] = await ethers.getSigners()
//
//     const HFundsFactory = await ethers.getContractFactory('contracts/handlers/funds/HFunds.sol:HFunds')
//     const HUniswapV2Factory = await ethers.getContractFactory('contracts/handlers/uniswapv2/HUniswapV2.sol:HUniswapV2')
//
//     HFundsFactory.connect(signers[0])
//     HUniswapV2Factory.connect(signers[0])
//
//     const hFunds: HFunds = <HFunds>await HFundsFactory.deploy()
//     // Quickswap
//     // https://polygonscan.com/address/0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff
//     const hUniswapV2: HUniswapV2 = <HUniswapV2>await HUniswapV2Factory.deploy('0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff')
//     console.log(hUniswapV2.deployTransaction)
//
//     await hFunds.deployed()
//     await hUniswapV2.deployed()
//
//     // console.log('hFunds deployed to: ', hFunds.address)
//     console.log('hUniswapV2 deployed to: ', hUniswapV2.address)
//   })

task('deploy:handlers-polygon')
  .setAction(async function (taskArguments: any, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()

    const HAaveProtocolV2Factory = await ethers.getContractFactory('contracts/handlers/aavev2/HAaveProtocolV2.sol:HAaveProtocolV2')
    HAaveProtocolV2Factory.connect(signers[0])

    const hAaveV2: HAaveProtocolV2 = <HAaveProtocolV2>await HAaveProtocolV2Factory.deploy()
    console.log(hAaveV2.deployTransaction)

    await hAaveV2.deployed()

    console.log('hAaveV2 deployed to: ', hAaveV2.address)
  })
