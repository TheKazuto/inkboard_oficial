import { NextResponse } from 'next/server'
import { kvGet, kvSet } from '@/lib/kvCache'

export const revalidate = 0

const CACHE_KEY = 'fear-greed-index'
const SOFT_TTL  = 60 * 60 * 1000  // 1 hour (ms)
const HARD_TTL  = 4 * 60 * 60     // 4 hours (seconds)

export async function GET() {
  // Fast path — serve from KV if fresh
  const cached = await kvGet<unknown>(CACHE_KEY, SOFT_TTL)
  if (cached.data && cached.fresh) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT' } })
  }

  try {
    // Fetch last 30 days: index[0] = today, [1] = yesterday, [6] = ~week ago, [29] = ~month ago
    const res = await fetch(
      'https://api.alternative.me/fng/?limit=30&format=json',
      { signal: AbortSignal.timeout(10_000) }
    )

    if (!res.ok) throw new Error(`Alternative.me HTTP ${res.status}`)

    const json = await res.json()
    const data = json.data

    if (!data || data.length === 0) throw new Error('No data in response')

    const now      = data[0]
    const yesterday = data[1] ?? data[0]
    const weekAgo  = data[6] ?? data[0]
    const monthAgo = data[29] ?? data[0]

    const result = {
      now: {
        value: parseInt(now.value),
        label: now.value_classification,
      },
      yesterday: {
        value: parseInt(yesterday.value),
        label: yesterday.value_classification,
      },
      weekAgo: {
        value: parseInt(weekAgo.value),
        label: weekAgo.value_classification,
      },
      monthAgo: {
        value: parseInt(monthAgo.value),
        label: monthAgo.value_classification,
      },
    }

    await kvSet(CACHE_KEY, result, HARD_TTL)
    return NextResponse.json(result, { headers: { 'X-Cache': 'MISS' } })
  } catch (err) {
    console.error('[fear-greed] fetch error:', err)
    // Return stale data on upstream error rather than propagating error
    if (cached.data) return NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } })
    return NextResponse.json({ error: 'Failed to fetch fear & greed index' }, { status: 502 })
  }
}
