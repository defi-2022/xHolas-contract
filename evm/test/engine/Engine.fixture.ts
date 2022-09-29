import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers } from 'hardhat'

import type { Engine } from '../../types/Engine'
import type { Engine__factory } from '../../types/factories/Engine__factory'

export async function deployEngineFixture(): Promise<{ engine: Engine }> {
  const signers: SignerWithAddress[] = await ethers.getSigners()
  const admin: SignerWithAddress = signers[0]

  const params: string[] = ['']
  const engineFactory: Engine__factory = <Engine__factory>await ethers.getContractFactory('Engine')
  const engine: Engine = <Engine>await engineFactory.connect(admin).deploy(
    ...params,
  )
  await engine.deployed()

  return { engine }
}
