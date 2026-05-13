/**
 * swap/constants.ts — static configuration for the swap UI.
 */

import type { LifiToken, LifiChain } from './types'

export const NATIVE = '0x0000000000000000000000000000000000000000'

export const INTEGRATOR     = process.env.NEXT_PUBLIC_LIFI_INTEGRATOR ?? 'inkboard'
export const INTEGRATOR_FEE = parseFloat(process.env.NEXT_PUBLIC_LIFI_FEE ?? '0.002')

export const SLIPPAGE_PRESETS         = [0.005, 0.01, 0.02, 0.03]
export const SLIPPAGE_CROSS_DEFAULT   = 0.02
export const SLIPPAGE_ONCHAIN_DEFAULT = 0.01

/** Native-token gas buffer (human units) reserved when user clicks MAX. */
export const GAS_BUFFER: Record<number, number> = {
  1: 0.003, 56: 0.003, 137: 0.5, 43114: 0.01, 250: 1.0, 100: 0.1, 5000: 0.5,
  10: 0.0001, 8453: 0.0001, 42161: 0.0001, 57073: 0.0001,
  324: 0.0001, 59144: 0.0001, 534352: 0.0001, 81457: 0.0001,
}

const CG = 'https://assets.coingecko.com/coins/images'

/** Well-known token logo overrides, indexed by uppercase symbol. */
export const OVERRIDE_LOGOS: Record<string, string> = {
  ETH:  `${CG}/279/small/ethereum.png`,
  WETH: `${CG}/2518/small/weth.png`,
  USDC: `${CG}/6319/small/usdc.png`,
  USDT: `${CG}/325/small/tether.png`,
  WBTC: `${CG}/7598/small/wrapped_bitcoin_new.png`,
  BNB:  `${CG}/825/small/bnb-icon2_2x.png`,
  POL:  `${CG}/4713/small/polygon-ecosystem-token.png`,
  MATIC:`${CG}/4713/small/polygon-ecosystem-token.png`,
  AVAX: `${CG}/12559/small/Avalanche_Circle_RedWhite_Trans.png`,
  SOL:  `${CG}/4128/small/solana.png`,
  DAI:  `${CG}/9956/small/Badge_Dai.png`,
  LINK: `${CG}/877/small/chainlink-new-logo.png`,
  UNI:  `${CG}/12504/small/uniswap-logo.png`,
  CRV:  `${CG}/12124/small/Curve.png`,
  ARB:  `${CG}/16547/small/arb.jpg`,
  OP:   `${CG}/25244/small/Optimism.png`,
}

/** Fallback public RPCs by chainId — used when LI.FI doesn't expose metamask.rpcUrls. */
export const FALLBACK_RPC: Record<number, string> = {
  1:    'https://ethereum-rpc.publicnode.com',
  56:   'https://bsc-rpc.publicnode.com',
  137:  'https://polygon-rpc.com',
  42161:'https://arb1.arbitrum.io/rpc',
  10:   'https://mainnet.optimism.io',
  8453: 'https://mainnet.base.org',
  43114:'https://api.avax.network/ext/bc/C/rpc',
  57073:'https://rpc-gel.inkonchain.com',
  250:  'https://rpc.ftm.tools',
  100:  'https://rpc.gnosischain.com',
  324:  'https://mainnet.era.zksync.io',
  59144:'https://rpc.linea.build',
  534352:'https://rpc.scroll.io',
  5000: 'https://rpc.mantle.xyz',
  81457:'https://rpc.blast.io',
}

export const ERC20_APPROVE_ABI = [{
  name: 'approve', type: 'function',
  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const

export const QUOTE_EXPIRY       = 60
export const QUOTE_AUTO_REFRESH = 55  // refresh 5s before expiry

export const INK_NATIVE: LifiToken = {
  address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18,
  chainId: 57073, logoURI: OVERRIDE_LOGOS.ETH,
}

export const USDC_INK: LifiToken = {
  address:  '0xF1815bd50389c46847f0Bda824eC8da914045D14',
  symbol:   'USDC.e',
  name:     'Bridged USD Coin',
  decimals: 6,
  chainId:  57073,
  logoURI:  OVERRIDE_LOGOS.USDC,
}

export const INK_CHAIN: LifiChain = {
  id: 57073, key: 'ink', name: 'Ink', chainType: 'EVM', coin: 'ETH', logoURI: '',
  nativeToken: INK_NATIVE,
  metamask: {
    blockExplorerUrls: ['https://explorer.inkonchain.com/'],
    rpcUrls:           ['https://rpc-gel.inkonchain.com'],
    chainName:         'Ink',
  },
}
