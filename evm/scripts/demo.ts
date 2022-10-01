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
    xHolasAddress: '0xaAEdbA647049E2Bf6E0b65B1f004609d90aeb22e',
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
    xHolasAddress: '0x72015E6Db2354f3297F1Cee273246A168F535AFE',
    fundsAddress: '0x63aFaFb5053019246733963DE595AE093Ea34F00',
    uniswapV2Address: '0x4daf79a071380344A9c3a17cFFe98A63A54e9c30',
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

const token = {
  goerli: {
    WETH: '0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6',
    USDT: '0xf4b2cbc3ba04c478f0dc824f4806ac39982dce73',
    WBNB: '0xb19693feb013bab65866de0a845a9511064230ce',
  },
  bsc: {
    WBNB: '0x094616f0bdfb0b526bd735bf66eca0ad254ca81f',
    LINK: '0x84b9b910527ad5c03a9ca831909e21e236ea7b06',
    CAKE: '0xfa60d973f7642b748046464e165a65b7323b0dee',
  }
}

const dataSwap = new ethers.utils.Interface(['function swapExactETHForTokens(uint256 value, uint256 amountOutMin, address[] calldata path)'])
  .encodeFunctionData(
    'swapExactETHForTokens',
    [
      ethers.utils.parseEther('0.0001'),
      '0',
      [token.goerli.WETH, token.goerli.USDT],
    ],
  )

const dataRedeem = new ethers.utils.Interface(['function sendToken(address token, uint256 amount, address receiver)'])
  .encodeFunctionData(
    'sendToken',
    [
      token.goerli.USDT,
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
    // networkConfig.goerli.fundsAddress,
    networkConfig.goerli.fundsAddress,
    // networkConfig.goerli.fundsAddress,
    // networkConfig.goerli.uniswapV2Address,
    networkConfig.bsc.uniswapV2Address,
  ]
  const configs = [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    // '0x0000000000000000000000000000000000000000000000000000000000000000',
    // '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ]

  const datas = [
    // new ethers.utils.Interface(['function inject(address[] calldata tokens, uint256[] calldata amounts)'])
    //   .encodeFunctionData(
    //     'inject',
    //     [
    //       [token.goerli.WETH],
    //       [ethers.utils.parseEther('0.0002')],
    //     ],
    //   ),
    // new ethers.utils.Interface(['function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path)'])
    //   .encodeFunctionData(
    //     'swapExactTokensForTokens',
    //     [
    //       ethers.utils.parseEther('2'),
    //       '0',
    //       [token.bsc.LINK, token.bsc.WBNB],
    //     ],
    //   ),
    // new ethers.utils.Interface(['function approve(address spender, uint256 amount)'])
    //   .encodeFunctionData(
    //     'approve',
    //     [
    //       networkConfig.goerli.bridgeAddress,
    //       ethers.constants.MaxUint256,
    //     ],
    //   ),
    // new ethers.utils.Interface(['function sendToken(address token, uint256 amount, address receiver)'])
    //   .encodeFunctionData(
    //     'sendToken',
    //     [
    //       token.goerli.USDT,
    //       ethers.constants.MaxUint256, // max uint256 to send all token balance from contract to user
    //       signer.goerli.address,
    //     ],
    //   ),
    // new ethers.utils.Interface(['function sendToken(address token, uint256 amount, address receiver)'])
    //   .encodeFunctionData(
    //     'sendToken',
    //     [
    //       token.goerli.USDT,
    //       ethers.constants.MaxUint256, // max uint256 to send all token balance from contract to user
    //       signer.goerli.address,
    //     ],
    //   ),
    // new ethers.utils.Interface(['function swapExactETHForTokens(uint256 value, uint256 amountOutMin, address[] calldata path)'])
    //   .encodeFunctionData(
    //     'swapExactETHForTokens',
    //     [
    //       ethers.utils.parseEther('0.0001'),
    //       '0',
    //       [token.goerli.WETH, token.goerli.USDT],
    //     ],
    //   ),
    new ethers.utils.Interface(['function inject(address[] calldata tokens, uint256[] calldata amounts)'])
      .encodeFunctionData(
        'inject',
        [
          [token.goerli.WBNB],
          [ethers.utils.parseEther('0.0001')],
        ],
      ),
    // 0x23b872dd
    // 0x917ec5f9f8cd5932c613e12e4275951d32064e8b
    // 0xaaedba647049e2bf6e0b65b1f004609d90aeb22e
    // 0x00000000000000000000000000005af3107a4000
    // new ethers.utils.Interface(['function inject(address[] calldata tokens, uint256[] calldata amounts)'])
    //   .encodeFunctionData(
    //     'inject',
    //     [
    //       [token.goerli.WETH],
    //       [ethers.utils.parseEther('0.001')],
    //     ],
    //   ),
    // new ethers.utils.Interface(['function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path)'])
    //   .encodeFunctionData(
    //     'swapExactTokensForTokens',
    //     [
    //       '1000000',
    //       '0',
    //       [token.goerli.USDT, token.goerli.WETH],
    //     ],
    //   ),
    new ethers.utils.Interface(['function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path)'])
      .encodeFunctionData(
        'swapExactTokensForTokens',
        [
          ethers.utils.parseEther('0.00001'),
          '0',
          [token.bsc.WBNB, token.bsc.LINK],
        ],
      ),
  ]
  const chainIds = [
    // 4,
    2,
    // 2,
    // 2,
    4,
  ]
  // console.log(tos)
  // console.log(configs)
  // console.log(datas)
  // return

  const tx = await xHolas.goerli.executeTransactionsEntryPoint(tos, configs, chainIds, datas, {
    // value: ethers.utils.parseEther('0.0001'),
    ...stupidConfig.bsc,
  })
  // const tx = await xHolas.bsc.executeTransactionsEntryPoint(tos, configs, chainIds, datas, {
  //   ...stupidConfig.bsc,
  // })
  console.log(await tx.wait())
}

basicUniswapViaXHolas().catch((err) => {
  console.error(err)
  process.exit(1)
})
