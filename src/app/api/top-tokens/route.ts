import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/kvCache'
import { buildCoinGeckoUrl, getCoinGeckoHeaders } from '@/lib/priceService'

export const revalidate = 0

// KV cache — shared across all isolates/users
// SOFT_TTL = 1h  →  fresh window (market cap rarely changes within 1h)
// HARD_TTL = 2h  →  stale fallback stays available 1h after soft miss
const CACHE_KEY = 'top-tokens'
const SOFT_TTL  = 60 * 60 * 1000  // 1 hour (ms)
const HARD_TTL  = 2 * 60 * 60     // 2 hours (seconds)

export async function GET() {
  // Fast path — serve from KV if fresh
  const cached = await kvGet<unknown>(CACHE_KEY, SOFT_TTL)
  if (cached.data && cached.fresh) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const res = await fetch(
      buildCoinGeckoUrl('/coins/markets', {
        vs_currency: 'usd',
        category: 'ink-ecosystem',
        order: 'market_cap_desc',
        per_page: 10,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      }),
      { headers: getCoinGeckoHeaders(), signal: AbortSignal.timeout(10_000) }
    )

    if (!res.ok) {
      // Return stale data on upstream error rather than propagating the error
      if (cached.data) return NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } })
      return NextResponse.json({ message: 'Service temporarily unavailable' }, { status: 502 })
    }

    const data = await res.json()
    await kvSet(CACHE_KEY, data, HARD_TTL)
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS' } })
  } catch (err) {
    console.error('[top-tokens] fetch error:', err)
    if (cached.data) return NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } })
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
