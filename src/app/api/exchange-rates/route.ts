import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/kvCache'

export const revalidate = 0

const CACHE_KEY = 'exchange-rates'
const SOFT_TTL  = 60 * 60 * 1000  // 1 hour (ms)
const HARD_TTL  = 4 * 60 * 60     // 4 hours (seconds)

export async function GET() {
  // Fast path — serve from KV if fresh
  const cached = await kvGet<unknown>(CACHE_KEY, SOFT_TTL)
  if (cached.data && cached.fresh) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json()

    if (data.result !== 'success') throw new Error('API returned non-success result')

    const result = {
      rates: {
        USD: 1,
        EUR: data.rates.EUR,
        BRL: data.rates.BRL,
      },
      updatedAt: data.time_last_update_utc,
    }

    await kvSet(CACHE_KEY, result, HARD_TTL)
    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } })
  } catch (err) {
    console.error('[exchange-rates] fetch error:', err)
    // Return stale data on upstream error rather than propagating error
    if (cached.data) return NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } })
    // Fallback to approximate rates only if completely unavailable
    return NextResponse.json({
      rates: { USD: 1, EUR: 0.92, BRL: 5.70 },
      updatedAt: null,
      fallback: true,
    })
  }
}
