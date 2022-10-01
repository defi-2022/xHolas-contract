import {
  tryNativeToUint8Array,
  // getOriginalAssetEth,
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  ChainId,
  // transferFromEthNative
} from '@certusone/wormhole-sdk'
import axios from 'axios'
import * as dotenv from 'dotenv'
import { ethers } from 'ethers'
import * as util from 'util'
import {XHolas__factory} from "../types";

dotenv.config({ path: '../.env' }) // running this script inside the 'scripts' folder

const type = 'mainnet' // 'testnet'
const wormholeRestAddress = `https://wormhole-v2-${type}-api.certus.one`

interface FetchVaa {
  code: number, message: string, details: any[], vaaBytes?: string,
}

async function fetchVaaAttempt(
  url: string,
  attempt: number,
  maxAttempts: number,
  attemptInterval: number = 90000,
): Promise<{ vaaBytes: string }> {
  if (attempt > maxAttempts) throw new Error('VAA not found!')
  // await new Promise((r) => setTimeout(r, attemptInterval))
  try {
    const { data } = await axios.get<FetchVaa>(url)
    if (data.code === 5 || data.message === 'requested VAA not found in store') throw new Error('VAA not found')
    return data as { vaaBytes: string }
  } catch (err) {
    console.log(`VAA attempt failed (${attempt}/${maxAttempts})`)
    attempt += 1
    return fetchVaaAttempt(url, attempt, maxAttempts, (attempt ** (5/3)) * attemptInterval)
  }
}

const srcNetwork = {
  id: 'avalanche',
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
  // id: 'goerli',
  // type: 'evm',
  // wormholeChainId: 2,
  // rpc: 'https://rpc.ankr.com/eth_goerli',
  // bridgeAddress: '0x706abc4E45D419950511e474C7B9Ed348A4a716c',
  // tokenBridgeAddress: '0xF890982f9310df57d00f659cf4fd87e65adEd8d7',
  // // change manually after deployment
  // xHolasAddress: '0xaAEdbA647049E2Bf6E0b65B1f004609d90aeb22e',
  // fundsAddress: '0x4daf79a071380344A9c3a17cFFe98A63A54e9c30',
  // uniswapV2Address: '0x7992275B169FeCd597e96409eBBD1826a671Fce8',
  // // for test
  // xProxyAddress: '0x9e3C92dC68EBC679563C6Ae075A6126072A076Db',
}

const targetNetwork = {
  id: 'polygon',
  type: 'evm',
  wormholeChainId: 5,
  rpc: 'https://polygon-mainnet.infura.io/v3/',
  bridgeAddress: '0x7A4B5a56256163F07b2C80A7cA55aBE66c4ec4d7',
  tokenBridgeAddress: '0x5a58505a96D1dbf8dF91cB21B54419FC36e93fdE',
  // change manually after deployment
  xHolasAddress: '0x14d1a6a132789Ba109DBAEA58D42E4e9F1193588',
  fundsAddress: '0x561f1ac3685be6f77b6c6270f20d1cc703f083de',
  uniswapV2Address: '0x31510D2dC8e148E0DE544eCaDC9315186bf44731',
  // for test
  xProxyAddress: '',
  // id: 'bsc',
  // type: 'evm',
  // wormholeChainId: 4,
  // rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
  // bridgeAddress: '0x68605AD7b15c732a30b1BbC62BE8F2A509D74b4D',
  // tokenBridgeAddress: '0x9dcF9D205C9De35334D646BeE44b2D2859712A09',
  // // change manually after deployment
  // xHolasAddress: '0x72015E6Db2354f3297F1Cee273246A168F535AFE',
  // fundsAddress: '0x63aFaFb5053019246733963DE595AE093Ea34F00',
  // uniswapV2Address: '0x4daf79a071380344A9c3a17cFFe98A63A54e9c30',
  // // for test
  // xProxyAddress: '',
}

// NOTE: Finality on Ethereum & Polygon is about 15 minutes when using Portal, for both mainnets and testnets
async function fetchVaa(src: string, logMatchAddress: string, tx: ethers.ContractReceipt){ // portal = true
  // tx.logs.filter((l) => {
  //   console.log(l.address)
  // })
  const seq = parseSequenceFromLogEth(tx, logMatchAddress);
  const emitterAddr = getEmitterAddressEth(srcNetwork.tokenBridgeAddress)

  console.log(
    'Searching for: ',
    `${wormholeRestAddress}/v1/signed_vaa/${srcNetwork.wormholeChainId}/${emitterAddr}/${seq}`
  );

  await new Promise((r) => setTimeout(r, 5000)); // wait for Guardian to pick up message

  const vaaPickUpUrl = `${wormholeRestAddress}/v1/signed_vaa/${srcNetwork.wormholeChainId}/${emitterAddr}/${seq}`
  const maxAttempts = 10
  const attemptInterval = 10000 // 10s
  let attempt = 0

  const { vaaBytes } = await fetchVaaAttempt(vaaPickUpUrl, attempt, maxAttempts, attemptInterval)
  const vaaHex = ethers.utils.hexlify(Buffer.from(vaaBytes, 'base64'))
  console.log('VAA found: ', vaaBytes)
  console.log(vaaHex)
  return vaaHex
}

async function main() {
  const provider = {
    goerli: new ethers.providers.JsonRpcProvider('https://rpc.ankr.com/eth_goerli'),
    bsc: new ethers.providers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/'),
    avalanche: new ethers.providers.JsonRpcProvider('https://rpc.ankr.com/avalanche'),
    polygon: new ethers.providers.JsonRpcProvider('https://rpc.ankr.com/polygon'),
  }

  const srcName = 'avalanche'
  const tgtName = 'polygon'

  const txHash = '0x378468df43070f50e0225608e50d2819336140a3769b693699c29845c78ed0d9'
  const txReceipt = await provider[srcName].getTransactionReceipt(txHash)
  // console.log(txReceipt)

  const vaaHex = await fetchVaa(srcName, srcNetwork.bridgeAddress, txReceipt)

  const xHolas = XHolas__factory.connect(
    targetNetwork.xHolasAddress,
    (new ethers.Wallet(process.env.PRIVATE_KEY as string)).connect(provider[tgtName])
  )

  const tx = await xHolas.executeTransactionsRelayPoint(vaaHex, {
    gasLimit: 21000000,
    gasPrice: String(Math.round((await provider[tgtName].getGasPrice()).toNumber() * 1.5))
  })
  console.log(tx.hash)
  console.log(await tx.wait())
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
