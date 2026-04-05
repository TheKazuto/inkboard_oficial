import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0

const LIFI_API = 'https://li.quest/v1'

// Allowlist of valid query parameter keys for the /quote endpoint
const ALLOWED_PARAMS = new Set([
  'fromChain', 'toChain', 'fromToken', 'toToken', 'fromAmount',
  'fromAddress', 'toAddress', 'slippage', 'integrator', 'fee',
  'allowBridges', 'denyBridges', 'allowExchanges', 'denyExchanges',
  'preferBridges', 'preferExchanges', 'order',
])

export async function GET(req: NextRequest) {
  // Forward only allowed params to LI.FI
  const params = new URLSearchParams()
  for (const [key, val] of req.nextUrl.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key)) params.set(key, val)
  }

  // Require minimum params
  if (!params.get('fromChain') || !params.get('fromToken') || !params.get('fromAmount')) {
    return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 })
  }

  // Validate parameter values
  const fromAmount = params.get('fromAmount')!
  if (!/^\d+$/.test(fromAmount) || fromAmount === '0') {
    return NextResponse.json({ message: 'Invalid fromAmount: must be a positive integer string' }, { status: 400 })
  }

  const slippage = params.get('slippage')
  if (slippage !== null) {
    const s = parseFloat(slippage)
    if (isNaN(s) || s < 0 || s > 0.5) {
      return NextResponse.json({ message: 'Invalid slippage: must be between 0 and 0.5' }, { status: 400 })
    }
  }

  const toAddress = params.get('toAddress')
  if (toAddress && !/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
    return NextResponse.json({ message: 'Invalid toAddress format' }, { status: 400 })
  }

  try {
    const res = await fetch(`${LIFI_API}/quote?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30_000),  // quotes can take a few seconds
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error('[lifi-quote]', e instanceof Error ? e.message : e)
    return NextResponse.json({ message: 'Failed to fetch quote from LI.FI' }, { status: 502 })
  }
}
