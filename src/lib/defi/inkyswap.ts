/**
 * inkyswap.ts — InkySwap AMM LP positions on Ink.
 */

import { rpcBatch } from '@/lib/ink'
import { log, redactError } from '@/lib/log'
import { TIMEOUT } from '@/lib/constants'
import { ethCall, decodeUint, balanceOfData } from './utils'
import type { DefiPosition, InkyPair } from './types'

const INKY_API = 'https://inkyswap.com/api'

interface PairMeta { address: string; base: string; quote: string; tvl: number; apr: number }

export async function fetchInkySwap(user: string): Promise<DefiPosition[]> {
  try {
    const res = await fetch(`${INKY_API}/pairs`, {
      signal: AbortSignal.timeout(TIMEOUT.NORMAL),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const raw = await res.json()
    const pairs: InkyPair[] = Array.isArray(raw) ? raw : (raw?.pairs ?? raw?.data ?? [])
    if (pairs.length === 0) return []

    const pairList: PairMeta[] = []
    for (const p of pairs) {
      const addr = (p.pair_address ?? p.address ?? '').toLowerCase()
      if (!addr || !addr.startsWith('0x')) continue
      const tvl = parseFloat(String(p.liquidity_usd ?? p.tvl ?? '0'))
      if (tvl < 50) continue
      pairList.push({
        address: addr,
        base:    p.token0?.symbol ?? '',
        quote:   p.token1?.symbol ?? '',
        tvl,
        apr:     parseFloat(String(p.apr ?? '0')),
      })
    }
    if (pairList.length === 0) return []

    // Step 2: balanceOf(user) for all pair LP tokens
    const balCalls = pairList.map((p, i) => ethCall(p.address, balanceOfData(user), i))
    const balResults = await rpcBatch(balCalls, TIMEOUT.NORMAL)

    const active: { pair: PairMeta; balance: bigint }[] = []
    for (let i = 0; i < pairList.length; i++) {
      const bal = decodeUint(balResults.find(r => r.id === i)?.result ?? '0x')
      if (bal > 0n) active.push({ pair: pairList[i], balance: bal })
    }
    if (active.length === 0) return []

    // Step 3: totalSupply for active pairs
    const tsCalls = active.map((a, i) => ethCall(a.pair.address, '0x18160ddd', 500 + i))
    const tsResults = await rpcBatch(tsCalls)

    const positions: DefiPosition[] = []
    for (let i = 0; i < active.length; i++) {
      const ts = decodeUint(tsResults.find(r => r.id === 500 + i)?.result ?? '0x')
      if (ts === 0n) continue
      const { pair, balance } = active[i]
      const share  = Number(balance) / Number(ts)
      const usdVal = share * pair.tvl
      if (usdVal < 0.01) continue

      positions.push({
        protocol: 'InkySwap',
        type:     'liquidity',
        logo:     'https://icons.llamao.fi/icons/protocols/inkyswap?w=48&h=48',
        url:      'https://inkyswap.com/liquidity',
        chain:    'Ink',
        label:    `${pair.base}/${pair.quote}`,
        tokens:   [pair.base, pair.quote].filter(Boolean),
        amountUSD: usdVal,
        apy: pair.apr > 0 ? pair.apr : 0,
        netValueUSD: usdVal,
        inRange: null,
      })
    }
    return positions
  } catch (e) {
    log.error('defi', 'InkySwap error', redactError(e))
    return []
  }
}
