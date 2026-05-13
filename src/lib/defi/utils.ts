/**
 * defi/utils.ts — shared helpers for protocol fetchers.
 *
 * Pure functions only — no module-level mutable state, so calls are safe
 * across Cloudflare Worker isolates.
 */

import { KNOWN_TOKENS, STABLECOINS } from '@/lib/ink'
import { getAllPrices } from '@/lib/priceService'

export interface RpcCall {
  jsonrpc: '2.0'
  id:      number | string
  method:  'eth_call'
  params:  [{ to: string; data: string }, 'latest']
}

export function ethCall(to: string, data: string, id: number | string): RpcCall {
  return { jsonrpc: '2.0', id, method: 'eth_call', params: [{ to, data }, 'latest'] }
}

export function decodeUint(hex: string): bigint {
  if (!hex || hex === '0x') return 0n
  try { return BigInt(hex.startsWith('0x') ? hex : '0x' + hex) } catch { return 0n }
}

export function balanceOfData(addr: string): string {
  return '0x70a08231' + addr.slice(2).toLowerCase().padStart(64, '0')
}

export function isStable(sym: string): boolean {
  return STABLECOINS.has(sym.toUpperCase().replace('₮', 'T'))
}

/** Address-indexed map of known tokens for symbol/decimals lookup. */
export const TOKEN_INFO: Readonly<Record<string, { symbol: string; decimals: number }>> =
  Object.freeze(
    Object.fromEntries(
      KNOWN_TOKENS.map(token => [
        token.contract.toLowerCase(),
        { symbol: token.symbol, decimals: token.decimals },
      ]),
    ),
  )

/** CoinGecko ID lookup by token symbol. */
export const COINGECKO_IDS: Readonly<Record<string, string>> =
  Object.freeze(
    Object.fromEntries(
      KNOWN_TOKENS.filter(t => t.coingeckoId).map(t => [t.symbol, t.coingeckoId]),
    ),
  )

/** Fetch USD prices for the given symbols from the shared priceService cache. */
export async function getTokenPricesUSD(symbols: string[]): Promise<Record<string, number>> {
  const prices: Record<string, number> = {}
  for (const s of symbols) if (isStable(s)) prices[s] = 1
  const toFetch = symbols.filter(s => prices[s] === undefined)
  if (!toFetch.length) return prices
  try {
    const allPrices = await getAllPrices()
    for (const sym of toFetch) {
      const id = COINGECKO_IDS[sym]
      if (id && allPrices[id]?.usd) prices[sym] = allPrices[id].usd
    }
  } catch { /* keep what we have */ }
  return prices
}
