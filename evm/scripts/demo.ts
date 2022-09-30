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
  xProxyAddress: string
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
    xHolasAddress: '0xf704d95712A8D272fd5835b245620F6139dF4638',
    fundsAddress: '0x4daf79a071380344A9c3a17cFFe98A63A54e9c30',
    uniswapV2Address: '0x7992275B169FeCd597e96409eBBD1826a671Fce8',
    // for test
    xProxyAddress: '0x9e3C92dC68EBC679563C6Ae075A6126072A076Db',
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
    // for test
    xProxyAddress: '',
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

const WETH = '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6'
const USDT = '0xf4b2cbc3ba04c478f0dc824f4806ac39982dce73'

const dataSwap = new ethers.utils.Interface(['function swapExactETHForTokens(uint256 value, uint256 amountOutMin, address[] calldata path)'])
  .encodeFunctionData(
    'swapExactETHForTokens',
    [
      ethers.utils.parseEther('0.0001'),
      '0',
      [WETH, USDT],
    ],
  )

const dataRedeem = new ethers.utils.Interface(['function sendToken(address token, uint256 amount, address receiver)'])
  .encodeFunctionData(
    'sendToken',
    [
      USDT,
      ethers.constants.MaxUint256, // max uint256 to send all token balance from contract to user
      signer.goerli.address,
    ],
  )


async function basicUniswapViaProxy() {
  const tos = [
    networkConfig.goerli.uniswapV2Address,
    networkConfig.goerli.fundsAddress,
  ]
  const configs = [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ]
  const datas = [
    dataSwap,
    dataRedeem,
  ]

  const contract = XHolas__factory.connect(networkConfig.goerli.xProxyAddress as string, signer.goerli)
  const tx = await contract.batchExec(tos, configs, datas, {
    value: ethers.utils.parseEther('0.0001'),
    ...stupidConfig.goerli,
  })
  console.log(await tx.wait())
}


async function basicUniswapViaXHolas() {
  const tos = [
    networkConfig.goerli.uniswapV2Address,
    networkConfig.goerli.fundsAddress,
  ]
  const configs = [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ]
  const datas = [
    dataSwap,
    dataRedeem,
  ]
  const chainIds = [
    2,
    2,
  ]
  // console.log(tos)
  // console.log(configs)
  // console.log(datas)
  // return

  const tx = await xHolas.goerli.executeTransactionsEntryPoint(tos, configs, chainIds, datas, {
    value: ethers.utils.parseEther('0.0001'),
    ...stupidConfig.goerli,
  })
  console.log(await tx.wait())
}

basicUniswapViaXHolas().catch((err) => {
  console.error(err)
  process.exit(1)
})
