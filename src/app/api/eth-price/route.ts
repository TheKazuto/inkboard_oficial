import { NextResponse } from 'next/server'
import { getEthPriceData } from '@/lib/ink'
import { log, redactError } from '@/lib/log'

// Cache on the server for 5 minutes — all clients share one upstream call
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const data = await getEthPriceData()
    if (!data.price) throw new Error('ETH price unavailable')
    return NextResponse.json(data)
  } catch (err) {
    log.error('eth-price', 'fetch failed', redactError(err))
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 502 })
  }
}
