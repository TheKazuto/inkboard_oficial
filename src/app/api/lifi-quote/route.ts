import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0

const LIFI_API = 'https://li.quest/v1'

const ALLOWED_PARAMS = new Set([
  'fromChain', 'toChain', 'fromToken', 'toToken', 'fromAmount',
  'fromAddress', 'toAddress', 'slippage', 'integrator', 'fee',
  'allowBridges', 'denyBridges', 'allowExchanges', 'denyExchanges',
  'preferBridges', 'preferExchanges', 'order',
])

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/
const CHAIN_ID_RE = /^\d+$/
const TOKEN_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/

function isNumericChainId(val: string): boolean {
  return CHAIN_ID_RE.test(val)
}

function isValidEvmAddress(val: string): boolean {
  return EVM_ADDRESS_RE.test(val)
}

export async function GET(req: NextRequest) {
  const params = new URLSearchParams()
  for (const [key, val] of req.nextUrl.searchParams.entries()) {
    if (ALLOWED_PARAMS.has(key)) params.set(key, val)
  }

  if (!params.get('fromChain') || !params.get('fromToken') || !params.get('fromAmount')) {
    return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 })
  }

  // Validate chain IDs are numeric
  const fromChain = params.get('fromChain')!
  const toChain = params.get('toChain')
  if (!isNumericChainId(fromChain)) {
    return NextResponse.json({ message: 'Invalid fromChain: must be a numeric chain ID' }, { status: 400 })
  }
  if (toChain && !isNumericChainId(toChain)) {
    return NextResponse.json({ message: 'Invalid toChain: must be a numeric chain ID' }, { status: 400 })
  }

  // Validate token addresses
  const fromToken = params.get('fromToken')!
  const toToken = params.get('toToken')
  if (!isValidEvmAddress(fromToken)) {
    return NextResponse.json({ message: 'Invalid fromToken: must be a valid EVM address' }, { status: 400 })
  }
  if (toToken && !isValidEvmAddress(toToken)) {
    return NextResponse.json({ message: 'Invalid toToken: must be a valid EVM address' }, { status: 400 })
  }

  // Validate fromAmount
  const fromAmount = params.get('fromAmount')!
  if (!/^\d+$/.test(fromAmount) || fromAmount === '0') {
    return NextResponse.json({ message: 'Invalid fromAmount: must be a positive integer string' }, { status: 400 })
  }

  // Validate slippage
  const slippage = params.get('slippage')
  if (slippage !== null) {
    const s = parseFloat(slippage)
    if (isNaN(s) || s < 0 || s > 0.5) {
      return NextResponse.json({ message: 'Invalid slippage: must be between 0 and 0.5' }, { status: 400 })
    }
  }

  // Validate addresses
  const fromAddress = params.get('fromAddress')
  const toAddress = params.get('toAddress')
  if (fromAddress && !isValidEvmAddress(fromAddress)) {
    return NextResponse.json({ message: 'Invalid fromAddress format' }, { status: 400 })
  }
  if (toAddress && !isValidEvmAddress(toAddress)) {
    return NextResponse.json({ message: 'Invalid toAddress format' }, { status: 400 })
  }

  // Validate integrator (alphanumeric + hyphens only)
  const integrator = params.get('integrator')
  if (integrator && !/^[a-zA-Z0-9-_.]{1,64}$/.test(integrator)) {
    return NextResponse.json({ message: 'Invalid integrator format' }, { status: 400 })
  }

  try {
    const res = await fetch(`${LIFI_API}/quote?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ message: 'LI.FI quote service returned an error' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (e: unknown) {
    console.error('[lifi-quote]', e instanceof Error ? e.message : e)
    return NextResponse.json({ message: 'Failed to fetch quote from LI.FI' }, { status: 502 })
  }
}
