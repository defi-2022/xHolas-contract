import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

// import { Proxy } from '../../../types'
import { HFunds, HUniswapV2 } from '../../../types'

// npx hardhat --network fantom deploy:handlers-fantom
task('deploy:handlers-fantom')
  .setAction(async function (taskArguments: any, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()

    const HFundsFactory = await ethers.getContractFactory('contracts/handlers/funds/HFunds.sol:HFunds')
    const HUniswapV2Factory = await ethers.getContractFactory('contracts/handlers/uniswapv2/HUniswapV2.sol:HUniswapV2')

    HFundsFactory.connect(signers[0])
    HUniswapV2Factory.connect(signers[0])

    // const hFunds: HFunds = <HFunds>await HFundsFactory.deploy()
    // Spooky
    // https://ftmscan.com/address/0xf491e7b69e4244ad4002bc14e878a34207e38c29
    const hUniswapV2: HUniswapV2 = <HUniswapV2>await HUniswapV2Factory.deploy('0xf491e7b69e4244ad4002bc14e878a34207e38c29')
    // console.log(hUniswapV2.deployTransaction)

    // await hFunds.deployed()
    await hUniswapV2.deployed()

    // console.log('hFunds deployed to: ', hFunds.address)
    console.log('hUniswapV2 deployed to: ', hUniswapV2.address)
  })

// task('deploy:handlers-goerli')
//   .setAction(async function (taskArguments: any, { ethers }) {
//     const signers: SignerWithAddress[] = await ethers.getSigners()
//
//     const XProxyFactory = await ethers.getContractFactory('contracts/xProxy.sol:Proxy')
//
//     XProxyFactory.connect(signers[0])
//
//     const xProxy: Proxy = <Proxy>await XProxyFactory.deploy()
//     // console.log(hUniswapV2.deployTransaction)
//
//     await xProxy.deployed()
//
//     console.log('xProxy deployed to: ', xProxy.address)
//   })
