import * as dotenv from 'dotenv'
import { ethers } from 'ethers'
import * as util from 'util'

import { XHolas, XHolas__factory } from '../types'

dotenv.config({ path: '../.env' }) // running this script inside the 'scripts' folder

interface NetworkConfig {
  type: string
  wormholeChainId: number
  rpc: string
  bridgeAddress: string // core bridge address
  tokenBridgeAddress: string
  xHolasAddress: string
  fundsAddress: string
  uniswapV2Address: string
}

// NOTE: MAKE SURE THAT ADDRESSES ARE IN VALID FORMAT (upper & lowercase)
const networkConfig: { [key: string]: NetworkConfig } = {
  goerli: {
    type: 'evm',
    wormholeChainId: 2,
    rpc: 'https://rpc.ankr.com/eth_goerli',
    bridgeAddress: '0x706abc4E45D419950511e474C7B9Ed348A4a716c',
    tokenBridgeAddress: '0xF890982f9310df57d00f659cf4fd87e65adEd8d7',
    // change manually after deployment
    xHolasAddress: '0xdD0eA340b48B068068D9d33ED68CDDD424A2c12F',
    fundsAddress: '0x1bbC12323606C21D80048C2726D81049bd996b02',
    uniswapV2Address: '0x53fbD5e4650CF9FfDA3866A8D2afFde0A18B6Ec2',
  },
  bsc: {
    // TESTNET
    type: 'evm',
    wormholeChainId: 4,
    rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    bridgeAddress: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
    tokenBridgeAddress: '0x9dcF9D205C9De35334D646BeE44b2D2859712A09',
    // change manually after deployment
    xHolasAddress: '0x57cCAEb5CbE8D641caaCAA3B30486eAA21c79882',
    fundsAddress: '0x8eD237335c3a68D3575E2D5da310A07669c17fFb',
    uniswapV2Address: '0x3a6B293fEb386CCC0b976FA711b3f69839717287',
  },
}

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY as string)

const networkConfigKeys = Object.keys(networkConfig)
const signer: { [key: string]: ethers.Wallet } = {}
const xHolas: { [key: string]: XHolas } = {}

networkConfigKeys.forEach((key) => {
  signer[key] = wallet.connect(new ethers.providers.JsonRpcProvider(networkConfig[key].rpc))
  xHolas[key] = XHolas__factory.connect(networkConfig[key].xHolasAddress, signer[key])
})

const stupidConfig = {
  goerli: { gasLimit: 21000000 },
  bsc: { gasLimit: 1000000 },
  mumbai: { gasLimit: 10000000 },
}


async function basicUniswap() {
  const tos = [
    networkConfig.goerli.fundsAddress,
    networkConfig.goerli.uniswapV2Address,
    networkConfig.goerli.fundsAddress,
  ]
  const configs = [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ]
  const chainIds = [
    2,
    2,
    2,
  ]
  // abi.encode(['deposit(uint256,uint256)', '10000', '10000'])
  const datas = [
    '0xd0797f84000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000005f8efd0',
    '0xef66f7250000000000000000000000000000000000000000000000000000000005f5e100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    '0xdb71410e000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000101fc58f4432000',
  ]

  xHolas.goerli.executeTransactionsEntryPoint(tos, configs, chainIds, datas, {
    value: '0.0001',
    ...stupidConfig.goerli,
  })
}

basicUniswap().catch((err) => {
  console.error(err)
  process.exit(1)
})
