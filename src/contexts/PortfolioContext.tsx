'use client'
import { cachedFetch } from '@/lib/dataCache'

/**
 * PortfolioContext — single source of truth for portfolio totals.
 *
 * Fires 3 API calls in parallel the moment a wallet is connected.
 * Components read cached totals without re-fetching on page navigation.
 *
 * Key fixes:
 * - Debounce address/connection changes (wagmi can flicker on navigation)
 * - Never reset to ZERO while data is already loaded for the same address
 * - Cache by address — navigating back doesn't re-fetch if data is fresh (<5min)
 */

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef, useReducer, ReactNode,
} from 'react'
import { useWallet } from './WalletContext'

// ─── DeFi position type (shared with defi page and portfolio context) ────────
export interface DefiSupplyEntry  { symbol: string; amount: number; amountUSD: number; apy: number }
export interface DefiBorrowEntry  { symbol: string; amount: number; amountUSD: number; apr?: number }
export interface DefiPosition {
  protocol:            string
  type:                'lending' | 'pool' | 'vault'
  logo:                string
  url:                 string
  chain:               string
  label:               string
  tokens?:             string[]
  amountUSD?:          number
  netValueUSD:         number
  apy?:                number
  inRange?:            boolean | null
  // Lending-specific (e.g. Tydro)
  supply?:             DefiSupplyEntry[]
  borrow?:             DefiBorrowEntry[]
  totalCollateralUSD?: number
  totalDebtUSD?:       number
  healthFactor?:       number | null
}

// ─── Raw data types (shared with portfolio page) ─────────────────────────────
export interface TokenData {
  symbol: string; name: string; balance: number
  price: number; value: number; color: string; percentage: number
  imageUrl?: string
}
export interface NFTData {
  id: string; contract: string; tokenId: string
  collection: string; symbol: string; name: string
  image: string | null; floorETH: number; floorUSD: number
  openSeaUrl: string
}

export interface PortfolioTotals {
  tokenValueUSD:       number
  nftValueUSD:         number
  defiNetValueUSD:     number
  totalValueUSD:       number
  defiActiveProtocols: string[]
  defiTotalDebtUSD:    number
  defiTotalSupplyUSD:  number
  defiPositions:       DefiPosition[]  // raw positions array — consumed by DeFiPositions widget
  tokens:              TokenData[]  // full token list — consumed by portfolio page
  nfts:                NFTData[]    // full NFT list   — consumed by portfolio page
  nftTotal:            number       // total NFT count (may exceed nfts.length if >50)
  nftsNoKey:           boolean      // true when Etherscan API key is missing
}

export type LoadStatus = 'idle' | 'loading' | 'partial' | 'done' | 'error'

interface PortfolioContextValue {
  totals:      PortfolioTotals
  status:      LoadStatus
  lastUpdated: Date | null
  refresh:     () => void
}

const ZERO: PortfolioTotals = {
  tokenValueUSD:       0,
  nftValueUSD:         0,
  defiNetValueUSD:     0,
  totalValueUSD:       0,
  defiActiveProtocols: [],
  defiTotalDebtUSD:    0,
  defiTotalSupplyUSD:  0,
  defiPositions:       [],
  tokens:              [],
  nfts:                [],
  nftTotal:            0,
  nftsNoKey:           false,
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ─── Reducer — replaces multiple useRef accumulators ─────────────────────────
type AccAction =
  | { type: 'RESET' }
  | { type: 'SEED'; totals: PortfolioTotals }
  | { type: 'SET_TOKENS'; value: number; tokens: TokenData[] }
  | { type: 'SET_NFTS'; value: number; nfts: NFTData[]; total: number; noKey: boolean }
  | { type: 'SET_NFTS_NO_KEY' }
  | { type: 'SET_DEFI'; netValue: number; debtUSD: number; supplyUSD: number; protocols: string[]; positions: DefiPosition[] }

function portfolioReducer(state: PortfolioTotals, action: AccAction): PortfolioTotals {
  switch (action.type) {
    case 'RESET':
      return { ...ZERO }
    case 'SEED':
      return { ...action.totals }
    case 'SET_TOKENS': {
      const tokenValueUSD = action.value
      return { ...state, tokenValueUSD, totalValueUSD: tokenValueUSD + state.nftValueUSD + state.defiNetValueUSD, tokens: action.tokens }
    }
    case 'SET_NFTS': {
      const nftValueUSD = action.value
      return { ...state, nftValueUSD, totalValueUSD: state.tokenValueUSD + nftValueUSD + state.defiNetValueUSD, nfts: action.nfts, nftTotal: action.total, nftsNoKey: action.noKey }
    }
    case 'SET_NFTS_NO_KEY':
      return { ...state, nftsNoKey: true }
    case 'SET_DEFI': {
      const defiNetValueUSD = action.netValue
      return {
        ...state,
        defiNetValueUSD,
        totalValueUSD:       state.tokenValueUSD + state.nftValueUSD + defiNetValueUSD,
        defiTotalDebtUSD:    action.debtUSD,
        defiTotalSupplyUSD:  action.supplyUSD,
        defiActiveProtocols: action.protocols,
        defiPositions:       action.positions,
      }
    }
    default:
      return state
  }
}

interface CacheEntry {
  totals:    PortfolioTotals
  fetchedAt: number
}

// Module-level cache — survives React re-renders and page navigation
const portfolioCache = new Map<string, CacheEntry>()

const PortfolioCtx = createContext<PortfolioContextValue>({
  totals:      ZERO,
  status:      'idle',
  lastUpdated: null,
  refresh:     () => {},
})

export function usePortfolio() {
  return useContext(PortfolioCtx)
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { stableAddress: address, isConnected } = useWallet()

  const [totals,      dispatch]      = useReducer(portfolioReducer, ZERO)
  const [status,      setStatus]     = useState<LoadStatus>('idle')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadingAddr = useRef<string | null>(null)

  // Persist to cache once all fetches for a load cycle complete
  useEffect(() => {
    if (status === 'done' && address) {
      portfolioCache.set(address.toLowerCase(), { totals, fetchedAt: Date.now() })
    }
  }, [status, totals, address])

  const load = useCallback(async (addr: string, force = false) => {
    const key   = addr.toLowerCase()
    const entry = portfolioCache.get(key)

    // Serve from cache if fresh and not forced
    if (!force && entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
      dispatch({ type: 'SEED', totals: entry.totals })
      setStatus('done')
      setLastUpdated(new Date(entry.fetchedAt))
      return
    }

    // Already loading this address — don't double-fetch
    if (loadingAddr.current === key) return
    loadingAddr.current = key

    // Seed from cache while re-fetching so UI doesn't flash empty
    if (entry) {
      dispatch({ type: 'SEED', totals: entry.totals })
    } else {
      dispatch({ type: 'RESET' })
    }

    setStatus('loading')

    const fetchTokens = async () => {
      try {
        const data = await cachedFetch<any>('/api/token-exposure', addr)
        if (loadingAddr.current !== key) return // stale
        dispatch({
          type:   'SET_TOKENS',
          value:  Number(data.totalValue ?? 0),
          tokens: Array.isArray(data.tokens) ? data.tokens : [],
        })
        setStatus(s => s === 'loading' ? 'partial' : s)
      } catch { /* keeps previous value */ }
    }

    const fetchNFTs = async () => {
      try {
        const data = await cachedFetch<any>('/api/nfts', addr)
        if (loadingAddr.current !== key) return
        if (data.error === 'no_api_key') {
          dispatch({ type: 'SET_NFTS_NO_KEY' })
          return
        }
        dispatch({
          type:  'SET_NFTS',
          value: Number(data.nftValue ?? 0),
          nfts:  Array.isArray(data.nfts) ? data.nfts : [],
          total: Number(data.total ?? 0),
          noKey: false,
        })
        setStatus(s => s === 'loading' ? 'partial' : s)
      } catch { /* keeps previous value */ }
    }

    const fetchDefi = async () => {
      try {
        const data = await cachedFetch<any>('/api/defi', addr)
        if (loadingAddr.current !== key) return
        const s = data.summary ?? {}
        dispatch({
          type:      'SET_DEFI',
          netValue:  Number(s.netValueUSD    ?? 0),
          debtUSD:   Number(s.totalDebtUSD   ?? 0),
          supplyUSD: Number(s.totalSupplyUSD ?? 0),
          protocols: Array.isArray(s.activeProtocols) ? s.activeProtocols : [],
          positions: Array.isArray(data.positions)    ? data.positions    : [],
        })
        setStatus(s2 => s2 === 'loading' ? 'partial' : s2)
      } catch { /* keeps previous value */ }
    }

    await Promise.allSettled([fetchTokens(), fetchNFTs(), fetchDefi()])

    if (loadingAddr.current === key) {
      setStatus('done')
      setLastUpdated(new Date())
      loadingAddr.current = null
    }
  }, [])

  // Debounce address changes to avoid wagmi flicker on navigation
  useEffect(() => {
    if (!isConnected || !address) {
      // Only reset if we don't have cached data (avoid flicker on nav)
      const hasCached = address && portfolioCache.has(address.toLowerCase())
      if (!hasCached) {
        loadingAddr.current = null
        dispatch({ type: 'RESET' })
        setStatus('idle')
        setLastUpdated(null)
      }
      return
    }

    const timer = setTimeout(() => {
      load(address)
    }, 100) // 100ms debounce — absorbs wagmi reconnect flicker

    return () => clearTimeout(timer)
  }, [address, isConnected, load])

  const refresh = useCallback(() => {
    if (address && isConnected) {
      loadingAddr.current = null // allow re-fetch
      load(address, true)        // force bypass cache
    }
  }, [address, isConnected, load])

  return (
    <PortfolioCtx.Provider value={{ totals, status, lastUpdated, refresh }}>
      {children}
    </PortfolioCtx.Provider>
  )
}
