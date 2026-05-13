/**
 * /api/defi — aggregates a user's DeFi positions across all Ink protocols.
 *
 * Heavy lifting lives in `lib/defi/<protocol>.ts`. This file is just the
 * HTTP boundary: validation + parallel fan-out + summary aggregation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseEvmAddress, ValidationError, badRequest } from '@/lib/validation'
import { fetchTydro }     from '@/lib/defi/tydro'
import { fetchVelodrome } from '@/lib/defi/velodrome'
import { fetchInkySwap }  from '@/lib/defi/inkyswap'
import { fetchCurve }     from '@/lib/defi/curve'
import { fetchNado }      from '@/lib/defi/nado'
import type { DefiPosition } from '@/lib/defi/types'

export const revalidate = 0

function unwrap(r: PromiseSettledResult<DefiPosition[]>): DefiPosition[] {
  return r.status === 'fulfilled' ? r.value : []
}

export async function GET(req: NextRequest) {
  let address: string
  try {
    address = parseEvmAddress(req.nextUrl.searchParams.get('address'))
  } catch (e) {
    return badRequest(e instanceof ValidationError ? e.message : 'Invalid address')
  }

  const [tydroR, veloR, inkyR, curveR, nadoR] = await Promise.allSettled([
    fetchTydro(address),
    fetchVelodrome(address),
    fetchInkySwap(address),
    fetchCurve(address),
    fetchNado(address),
  ])

  const allPositions: DefiPosition[] = [
    ...unwrap(tydroR), ...unwrap(veloR),
    ...unwrap(inkyR),  ...unwrap(curveR),
    ...unwrap(nadoR),
  ]

  const totalNetValueUSD = allPositions.reduce((s, p) => s + (p.netValueUSD ?? 0), 0)
  const totalDebtUSD     = allPositions.reduce((s, p) => s + (p.totalDebtUSD ?? 0), 0)
  const totalSupplyUSD   = allPositions.reduce((s, p) => s + (p.totalCollateralUSD ?? p.amountUSD ?? 0), 0)
  const activeProtocols  = [...new Set(allPositions.map(p => p.protocol))]

  return NextResponse.json({
    positions: allPositions,
    summary: { totalNetValueUSD, totalDebtUSD, totalSupplyUSD, netValueUSD: totalNetValueUSD, activeProtocols },
  })
}
