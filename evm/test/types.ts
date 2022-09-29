import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address'

import type { Engine } from '../types/Engine'

type Fixture<T> = () => Promise<T>;

declare module 'mocha' {
  export interface Context {
    engine: Engine
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>
    signers: Signers
  }
}

export interface Signers {
  admin: SignerWithAddress
}
