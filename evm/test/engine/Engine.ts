import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'
import { ethers } from 'hardhat'

import type { Signers } from '../types'
import { shouldBehaveLikeEngine } from './Engine.behavior'
import { deployEngineFixture } from './Engine.fixture'

describe('Unit tests', function () {
  before(async function () {
    this.signers = {} as Signers

    const signers: SignerWithAddress[] = await ethers.getSigners()
    this.signers.admin = signers[0]

    this.loadFixture = loadFixture
  })

  describe('Engine', function () {
    beforeEach(async function () {
      const { engine } = await this.loadFixture(deployEngineFixture)
      this.engine = engine
    })

    shouldBehaveLikeEngine()
  })
})
