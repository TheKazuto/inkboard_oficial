import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0

const LIFI_API = 'https://li.quest/v1'

const ALLOWED_PARAMS = new Set(['bridge', 'fromChain', 'toChain', 'txHash'])

const CHAIN_ID_RE = /^\d+$/
const BRIDGE_RE = /^[a-zA-Z0-9_-]{1,64}$/

export async function GET(req: NextRequest) {
  const params = new URLSearchParams()
  for (const [key, val] of req.nextUrl.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key)) params.set(key, val)
  }

  const txHash = params.get('txHash')
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json({ message: 'Invalid or missing txHash' }, { status: 400 })
  }

  // Validate chain IDs
  const fromChain = params.get('fromChain')
  const toChain = params.get('toChain')
  if (fromChain && !CHAIN_ID_RE.test(fromChain)) {
    return NextResponse.json({ message: 'Invalid fromChain format' }, { status: 400 })
  }
  if (toChain && !CHAIN_ID_RE.test(toChain)) {
    return NextResponse.json({ message: 'Invalid toChain format' }, { status: 400 })
  }

  // Validate bridge name
  const bridge = params.get('bridge')
  if (bridge && !BRIDGE_RE.test(bridge)) {
    return NextResponse.json({ message: 'Invalid bridge format' }, { status: 400 })
  }

  try {
    const res = await fetch(`${LIFI_API}/status?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ message: 'LI.FI status service returned an error' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error('[lifi-status]', e instanceof Error ? e.message : e)
    return NextResponse.json({ message: 'Failed to fetch status from LI.FI' }, { status: 502 })
  }
}
