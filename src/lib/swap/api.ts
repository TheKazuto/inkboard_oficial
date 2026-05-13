'use client'

/**
 * swap/api.ts — client-side wrappers around our LI.FI proxy routes.
 *
 * The chain/token caches are intentionally module-level: this module is
 * imported only from `'use client'` components and runs in the user's
 * browser tab, so there's no cross-user leak (each tab has its own JS context).
 */

import type { LifiChain, LifiToken, LifiQuote } from './types'
import {
  NATIVE, INTEGRATOR, INTEGRATOR_FEE, OVERRIDE_LOGOS, FALLBACK_RPC,
} from './constants'
import { humanToWei } from './format'

let cachedChains: LifiChain[] | null = null
const chainRpcCache: Record<number, string> = {}

const TOKEN_CACHE_TTL = 5 * 60 * 1000
const tokenListCache: Record<number, { tokens: LifiToken[]; ts: number }> = {}

const PRIORITY_CHAINS = [57073, 1, 42161, 10, 8453, 137, 56, 43114, 250, 100]

const FALLBACK_CHAINS: LifiChain[] = [
  { id: 57073, key: 'ink', name: 'Ink',       chainType: 'EVM', coin: 'ETH',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'ETH',  name: 'Ether',      decimals: 18, logoURI: OVERRIDE_LOGOS.ETH },  metamask: { blockExplorerUrls: ['https://explorer.inkonchain.com/'],   rpcUrls: ['https://rpc-gel.inkonchain.com'],          chainName: 'Ink' } },
  { id: 1,     key: 'eth', name: 'Ethereum',  chainType: 'EVM', coin: 'ETH',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'ETH',  name: 'Ether',      decimals: 18, logoURI: OVERRIDE_LOGOS.ETH },  metamask: { blockExplorerUrls: ['https://etherscan.io/'],              rpcUrls: ['https://ethereum-rpc.publicnode.com'],     chainName: 'Ethereum' } },
  { id: 42161, key: 'arb', name: 'Arbitrum',  chainType: 'EVM', coin: 'ETH',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'ETH',  name: 'Ether',      decimals: 18, logoURI: OVERRIDE_LOGOS.ETH },  metamask: { blockExplorerUrls: ['https://arbiscan.io/'],               rpcUrls: ['https://arb1.arbitrum.io/rpc'],            chainName: 'Arbitrum One' } },
  { id: 10,    key: 'opt', name: 'Optimism',  chainType: 'EVM', coin: 'ETH',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'ETH',  name: 'Ether',      decimals: 18, logoURI: OVERRIDE_LOGOS.ETH },  metamask: { blockExplorerUrls: ['https://optimistic.etherscan.io/'],   rpcUrls: ['https://mainnet.optimism.io'],             chainName: 'OP Mainnet' } },
  { id: 8453,  key: 'bas', name: 'Base',      chainType: 'EVM', coin: 'ETH',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'ETH',  name: 'Ether',      decimals: 18, logoURI: OVERRIDE_LOGOS.ETH },  metamask: { blockExplorerUrls: ['https://basescan.org/'],              rpcUrls: ['https://mainnet.base.org'],                chainName: 'Base' } },
  { id: 137,   key: 'pol', name: 'Polygon',   chainType: 'EVM', coin: 'POL',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'POL',  name: 'POL',        decimals: 18, logoURI: OVERRIDE_LOGOS.POL },  metamask: { blockExplorerUrls: ['https://polygonscan.com/'],           rpcUrls: ['https://polygon-rpc.com'],                 chainName: 'Polygon' } },
  { id: 56,    key: 'bsc', name: 'BSC',       chainType: 'EVM', coin: 'BNB',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'BNB',  name: 'BNB',        decimals: 18, logoURI: OVERRIDE_LOGOS.BNB },  metamask: { blockExplorerUrls: ['https://bscscan.com/'],               rpcUrls: ['https://bsc-rpc.publicnode.com'],          chainName: 'BNB Smart Chain' } },
  { id: 43114, key: 'ava', name: 'Avalanche', chainType: 'EVM', coin: 'AVAX', logoURI: '', nativeToken: { address: NATIVE, symbol: 'AVAX', name: 'Avalanche',  decimals: 18, logoURI: OVERRIDE_LOGOS.AVAX }, metamask: { blockExplorerUrls: ['https://snowtrace.io/'],              rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'],   chainName: 'Avalanche C-Chain' } },
  { id: 250,   key: 'ftm', name: 'Fantom',    chainType: 'EVM', coin: 'FTM',  logoURI: '', nativeToken: { address: NATIVE, symbol: 'FTM',  name: 'Fantom',     decimals: 18, logoURI: '' },                  metamask: { blockExplorerUrls: ['https://ftmscan.com/'],               rpcUrls: ['https://rpc.ftm.tools'],                   chainName: 'Fantom Opera' } },
  { id: 100,   key: 'dai', name: 'Gnosis',    chainType: 'EVM', coin: 'XDAI', logoURI: '', nativeToken: { address: NATIVE, symbol: 'XDAI', name: 'xDAI',       decimals: 18, logoURI: '' },                  metamask: { blockExplorerUrls: ['https://gnosisscan.io/'],             rpcUrls: ['https://rpc.gnosischain.com'],             chainName: 'Gnosis' } },
]

export async function loadChains(): Promise<LifiChain[]> {
  if (cachedChains) return cachedChains
  try {
    const res = await fetch('/api/lifi-chains')
    if (!res.ok) throw new Error(`${res.status}`)
    const data: { chains: LifiChain[] } = await res.json()
    cachedChains = data.chains
      .filter(c => c.id > 0)
      .sort((a, b) => {
        const ai = PRIORITY_CHAINS.indexOf(a.id)
        const bi = PRIORITY_CHAINS.indexOf(b.id)
        if (ai !== -1 && bi !== -1) return ai - bi
        if (ai !== -1) return -1
        if (bi !== -1) return 1
        return a.name.localeCompare(b.name)
      })
    for (const c of cachedChains) {
      if (c.metamask?.rpcUrls?.[0]) chainRpcCache[c.id] = c.metamask.rpcUrls[0]
    }
    return cachedChains
  } catch {
    return FALLBACK_CHAINS
  }
}

export async function loadTokensForChain(chainId: number): Promise<LifiToken[]> {
  const cached = tokenListCache[chainId]
  if (cached && Date.now() - cached.ts < TOKEN_CACHE_TTL) return cached.tokens
  try {
    const res = await fetch(`/api/lifi-tokens?chain=${chainId}`)
    if (!res.ok) throw new Error(`${res.status}`)
    const data: { tokens: Record<string, LifiToken[]> } = await res.json()
    const tokens = data.tokens[String(chainId)] ?? []
    const result = tokens.map(t => ({
      ...t,
      logoURI: OVERRIDE_LOGOS[t.symbol.toUpperCase()] ?? t.logoURI,
    }))
    tokenListCache[chainId] = { tokens: result, ts: Date.now() }
    return result
  } catch {
    return []
  }
}

export async function fetchQuote(
  fromChain:   LifiChain,
  fromToken:   LifiToken,
  fromAmountHuman: string,
  toChain:     LifiChain,
  toToken:     LifiToken,
  fromAddress: string,
  slippage:    number,
  toAddress?:  string,
): Promise<LifiQuote> {
  const decimals = fromToken.decimals ?? 18
  const fromAmount = humanToWei(fromAmountHuman, decimals).toString()
  if (fromAmount === '0') throw new Error('Invalid amount')

  const params = new URLSearchParams({
    fromChain: String(fromChain.id), toChain: String(toChain.id),
    fromToken: fromToken.address,    toToken:   toToken.address,
    fromAmount, fromAddress,
    slippage: String(slippage),
    integrator: INTEGRATOR,
  })
  if (INTEGRATOR_FEE > 0) params.set('fee', String(INTEGRATOR_FEE))
  if (toAddress && toAddress !== fromAddress) params.set('toAddress', toAddress)

  const res = await fetch(`/api/lifi-quote?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? `${res.status}`)
  }
  return res.json()
}

export interface LifiStatus {
  status:     string
  substatus?: string
  receiving?: { txHash: string; chainId: number }
}

export async function fetchStatus(
  tool: string, fromChainId: number, toChainId: number, txHash: string,
): Promise<LifiStatus> {
  const params = new URLSearchParams({
    bridge: tool, fromChain: String(fromChainId), toChain: String(toChainId), txHash,
  })
  const res = await fetch(`/api/lifi-status?${params}`)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export function getRpcUrl(chain: LifiChain): string | null {
  return chain.metamask?.rpcUrls?.[0] ?? chainRpcCache[chain.id] ?? FALLBACK_RPC[chain.id] ?? null
}
