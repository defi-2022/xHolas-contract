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
  polygon: {
    type: 'evm',
    wormholeChainId: 5,
    rpc: 'https://polygon-mainnet.infura.io/v3/3f3a0a2dadb64084916a4ef7f4736910',
    bridgeAddress: '0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7',
    tokenBridgeAddress: '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE',
    // change manually after deployment
    xHolasAddress: '0x14d1a6a132789Ba109DBAEA58D42E4e9F1193588',
    fundsAddress: '0x561f1ac3685be6f77b6c6270f20d1cc703f083de',
    uniswapV2Address: '0x31510D2dC8e148E0DE544eCaDC9315186bf44731',
    // for test
    xProxyAddress: '',
  },
  fantom: {
    type: 'evm',
    wormholeChainId: 10,
    rpc: 'https://rpc.ftm.tools/',
    bridgeAddress: '0x126783A6Cb203a3E35344528B26ca3a0489a1485',
    tokenBridgeAddress: '0x7C9Fc5741288cDFdD83CeB07f3ea7e22618D79D2',
    // change manually after deployment
    xHolasAddress: '0x14d1a6a132789Ba109DBAEA58D42E4e9F1193588',
    fundsAddress: '0x1da890e50A4a0686cDBA5a4590073Ea89B430b1A',
    uniswapV2Address: '0x07E044CD870100efe50e94D088CAB873DAEd464F',
    // for test
    xProxyAddress: '',
  },
  avalanche: {
    type: 'evm',
    wormholeChainId: 6,
    rpc: 'https://rpc.ankr.com/avalanche',
    bridgeAddress: '0x54a8e5f9c4CbA08F9943965859F6c34eAF03E26c',
    tokenBridgeAddress: '0x0e082F06FF657D94310cB8cE8B0D9a04541d8052',
    // change manually after deployment
    xHolasAddress: '0x31510D2dC8e148E0DE544eCaDC9315186bf44731',
    fundsAddress: '0x14d1a6a132789ba109dbaea58d42e4e9f1193588',
    uniswapV2Address: '0x561F1Ac3685Be6F77B6c6270F20d1cc703F083De',
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
  polygon: {
    // USDCet: '0x4318cb63a2b8edf2de971e2f17f77097e499459d',
    USDC: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    WMATIC: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    WAVAXwormhole: '0x7Bb11E7f8b10E9e571E5d8Eace04735fDFB2358a',
  },
  avalanche: {
    USDC: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
    WAVAX: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  }
}


async function basicUniswapViaXHolas() {
  const tos = [
    networkConfig.avalanche.fundsAddress,
    networkConfig.avalanche.uniswapV2Address,
    networkConfig.polygon.uniswapV2Address,
  ]
  const configs = [
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  ]

  const datas = [
    new ethers.utils.Interface(['function inject(address[] calldata tokens, uint256[] calldata amounts)'])
      .encodeFunctionData(
        'inject',
        [
          [token.avalanche.WAVAX],
          [ethers.utils.parseEther('0.01')],
        ],
      ),
    new ethers.utils.Interface(['function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path)'])
      .encodeFunctionData(
        'swapExactTokensForTokens',
        [
          ethers.utils.parseEther('0.003'),
          '0',
          [token.avalanche.WAVAX, token.avalanche.USDC],
        ],
      ),
    new ethers.utils.Interface(['function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path)'])
      .encodeFunctionData(
        'swapExactTokensForTokens',
        [
          ethers.utils.parseEther('0.003'),
          '0',
          [token.polygon.WAVAXwormhole, token.polygon.WMATIC],
        ],
      ),
  ]
  const chainIds = [
    6,
    6,
    5,
  ]

  const tx = await xHolas.avalanche.executeTransactionsEntryPoint(tos, configs, chainIds, datas, {
    gasLimit: 5000000,
  })
  console.log(await tx.wait())
}

basicUniswapViaXHolas().catch((err) => {
  console.error(err)
  process.exit(1)
})
