/**
 * velodrome.ts — Velodrome v2 LP positions on Ink (CL pools are NFT-based
 * and require ERC-721 enumeration, which we skip in this read-only path).
 */

import { rpcBatch } from '@/lib/ink'
import { log, redactError } from '@/lib/log'
import { TIMEOUT } from '@/lib/constants'
import { ethCall, decodeUint, balanceOfData } from './utils'
import type { DefiPosition, GeckoPool } from './types'

const VELO_VOTER = '0x97cDBCe21B6fd0585d29E539B1B99dAd328a1123'
const GECKO_BASE = 'https://api.geckoterminal.com/api/v2'
const VELO_DEXES = ['velodrome-finance-v2-ink', 'velodrome-finance-slipstream-ink']
const ZERO_ADDR  = '0x' + '0'.repeat(40)

interface PoolMeta { address: string; base: string; quote: string; tvl: number; isCL: boolean }

export async function fetchVelodrome(user: string): Promise<DefiPosition[]> {
  try {
    const pools: PoolMeta[] = []

    const fetches = VELO_DEXES.map(dex =>
      fetch(`${GECKO_BASE}/networks/ink/dexes/${dex}/pools?page=1&sort=h24_volume_usd_desc`, {
        signal: AbortSignal.timeout(TIMEOUT.NORMAL),
        headers: { Accept: 'application/json' },
      })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null),
    )
    const results = await Promise.all(fetches)

    for (const json of results) {
      for (const p of (json?.data ?? []) as GeckoPool[]) {
        const addr = p.attributes?.address
        if (!addr) continue
        const tvl = parseFloat(p.attributes?.reserve_in_usd ?? '0')
        if (tvl < 100) continue
        const base  = p.relationships?.base_token?.data?.id?.split('_').pop()?.toUpperCase()  ?? ''
        const quote = p.relationships?.quote_token?.data?.id?.split('_').pop()?.toUpperCase() ?? ''
        const name  = (p.attributes?.name ?? '').toLowerCase()
        const isCL  = name.includes('cl') || name.includes('concentrated') || name.includes('-0.')
        if (isCL) continue  // CL pools are NFT-based, skip
        pools.push({ address: addr.toLowerCase(), base, quote, tvl, isCL })
      }
    }
    if (pools.length === 0) return []

    // Step 2: Get gauge addresses from Voter.gauges(pool)
    const gaugeCalls = pools.map((p, i) =>
      ethCall(VELO_VOTER, '0xa7e60a4b' + p.address.slice(2).padStart(64, '0'), i),
    )
    const gaugeResults = await rpcBatch(gaugeCalls, TIMEOUT.NORMAL)

    const gaugeMap = new Map<string, string>()
    for (let i = 0; i < pools.length; i++) {
      const g = gaugeResults.find(r => r.id === i)
      if (!g?.result || g.result === '0x') continue
      const gaugeAddr = ('0x' + g.result.slice(2).slice(-40)).toLowerCase()
      if (gaugeAddr !== ZERO_ADDR) gaugeMap.set(pools[i].address, gaugeAddr)
    }

    // Step 3: balanceOf(user) for pool LP tokens + gauge contracts
    const balCalls: ReturnType<typeof ethCall>[] = []
    const balMap: { idx: number; pool: PoolMeta; source: 'lp' | 'gauge' }[] = []
    let idx = 0
    for (const p of pools) {
      balCalls.push(ethCall(p.address, balanceOfData(user), idx))
      balMap.push({ idx, pool: p, source: 'lp' })
      idx++
      const gauge = gaugeMap.get(p.address)
      if (gauge) {
        balCalls.push(ethCall(gauge, balanceOfData(user), idx))
        balMap.push({ idx, pool: p, source: 'gauge' })
        idx++
      }
    }
    const balResults = await rpcBatch(balCalls, TIMEOUT.NORMAL)

    const userBalances = new Map<string, bigint>()
    for (const { idx: id, pool } of balMap) {
      const r = balResults.find(x => x.id === id)
      const bal = decodeUint(r?.result ?? '0x')
      if (bal > 0n) {
        userBalances.set(pool.address, (userBalances.get(pool.address) ?? 0n) + bal)
      }
    }
    if (userBalances.size === 0) return []

    // Step 4: totalSupply for active pools
    const activePools = pools.filter(p => userBalances.has(p.address))
    const tsCalls = activePools.map((p, i) => ethCall(p.address, '0x18160ddd', 500 + i))
    const tsResults = await rpcBatch(tsCalls)

    // Step 5: userShare = userBal / totalSupply × TVL
    const positions: DefiPosition[] = []
    for (let i = 0; i < activePools.length; i++) {
      const p  = activePools[i]
      const ts = decodeUint(tsResults.find(r => r.id === 500 + i)?.result ?? '0x')
      if (ts === 0n) continue
      const userBal = userBalances.get(p.address) ?? 0n
      const share   = Number(userBal) / Number(ts)
      const usdVal  = share * p.tvl
      if (usdVal < 0.01) continue

      positions.push({
        protocol: 'Velodrome',
        type:     'liquidity',
        logo:     'https://icons.llamao.fi/icons/protocols/velodrome-v2?w=48&h=48',
        url:      'https://velodrome.finance/liquidity?chain=57073',
        chain:    'Ink',
        label:    `${p.base}/${p.quote}`,
        tokens:   [p.base, p.quote].filter(Boolean),
        amountUSD: usdVal,
        apy: 0,
        netValueUSD: usdVal,
        inRange: null,
      })
    }
    return positions
  } catch (e) {
    log.error('defi', 'Velodrome error', redactError(e))
    return []
  }
}
