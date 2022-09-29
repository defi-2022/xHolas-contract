import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { task } from 'hardhat/config'

import { HFunds, HUniswapV2 } from '../../../types'

// npx hardhat --network goerli deploy:goerli-handlers
task('deploy:handlers-goerli')
  .setAction(async function (taskArguments: any, { ethers }) {
    const signers: SignerWithAddress[] = await ethers.getSigners()

    const HFundsFactory = await ethers.getContractFactory('contracts/handlers/funds/HFunds.sol:HFunds')
    const HUniswapV2Factory = await ethers.getContractFactory('contracts/handlers/uniswapv2/HUniswapV2.sol:HUniswapV2')

    HFundsFactory.connect(signers[0])
    HUniswapV2Factory.connect(signers[0])

    const hFunds: HFunds = <HFunds>await HFundsFactory.deploy()
    const hUniswapV2: HUniswapV2 = <HUniswapV2>await HUniswapV2Factory.deploy('0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45')
    // console.log(hUniswapV2.deployTransaction)

    await hFunds.deployed()
    await hUniswapV2.deployed()

    console.log('hFunds deployed to: ', hFunds.address)
    console.log('hUniswapV2 deployed to: ', hUniswapV2.address)
  })
