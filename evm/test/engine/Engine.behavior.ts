import { expect } from 'chai'
import { utils } from 'ethers'

import { CHAINS } from '../../utils/constant'

export function shouldBehaveLikeEngine(): void {
  it('should return the new greeting once it\'s changed', async function () {
    const contract = await this.engine.connect(this.signers.admin)

    expect(contract.greet()).to.equal('Hello, world!')

    await this.greeter.setGreeting('Bonjour, le monde!')
    expect(contract.greet()).to.equal('Bonjour, le monde!')
  })

  it('should build and cast on basic input', async function () {
    const contract = await this.engine.connect(this.signers.admin)

    const signatures = {
      basicDeposit: 'function deposit(address,uint256,uint256,uint256)',
      compoundDeposit: 'function deposit(string,uint256,uint256,uint256)',
    }

    const iface = {
      basicDeposit: new utils.Interface([signatures.basicDeposit]),
      compoundDeposit: new utils.Interface([signatures.compoundDeposit]),
    }

    const targets: string[] = []
    const chainIds: string[] = []
    const data: string[] = []

    const addressDAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    const amountToDeposit = 1e18 // 1 DAI

    // encoding data to run multiple things through cast on account
    // Depositing in DSA and then deposit in Compound through DSA.
    // bytes4 memory basicDeposit = bytes4(keccak256("deposit(address,uint256,uint256,uint256)"));
    // bytes4 memory compoundDeposit = bytes4(keccak256("deposit(string,uint256,uint256,uint256)"));

    targets.push('BASIC-A')
    chainIds.push(utils.hexlify(CHAINS.polygon))
    data.push(iface.basicDeposit.encodeFunctionData('deposit', [
      addressDAI, amountToDeposit, 0, 0,
    ]))

    targets.push('COMPOUND-A')
    chainIds.push(utils.hexlify(CHAINS.polygon))
    data.push(iface.compoundDeposit.encodeFunctionData('deposit', [
      'DAI-A', amountToDeposit, 0, 0,
    ]))

    contract.createStrategy(targets, chainIds, data)
  })
}
