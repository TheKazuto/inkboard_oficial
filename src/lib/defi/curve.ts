/**
 * curve.ts — Curve.fi LP positions on Ink. Uses Curve's api-core for pool
 * metadata and an on-chain log scan for 24h volume to derive realised APR.
 */

import { INK_RPC, rpcBatch } from '@/lib/ink'
import { log, redactError } from '@/lib/log'
import { TIMEOUT } from '@/lib/constants'
import { decodeUint } from './utils'
import type { DefiPosition, CurvePool } from './types'

// Topic hashes for the two TokenExchange variants used by Curve on Ink
const TE_CLASSIC = '0x8b3e96f2b889fa771c53c981b40daf005f63f637f1869f707052d15a3dd97140'
const TE_NG      = '0x143f1f8e861fbdeddd5b46e844b7d3ac7b86a122f36e8c463859ee6811b1f29c'

interface CurveLog {
  address?:     string
  data?:        string
  blockNumber?: string
}

export async function fetchCurve(user: string): Promise<DefiPosition[]> {
  try {
    const BASE = 'https://api-core.curve.finance/v1'
    const addr = user.toLowerCase()
    const paddedAddr = addr.slice(2).padStart(64, '0')

    const poolTypes = ['factory-twocrypto', 'factory-stable-ng']

    // Block number + pool lists in parallel
    const [bnRes, ...poolFetches] = await Promise.all([
      fetch(INK_RPC, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'eth_blockNumber', params: [] }),
        signal: AbortSignal.timeout(TIMEOUT.FAST),
      }).then(r => r.json()).catch(() => ({ result: '0x0' })),
      ...poolTypes.map(t =>
        fetch(`${BASE}/getPools/ink/${t}`, { signal: AbortSignal.timeout(TIMEOUT.FAST), cache: 'no-store' })
          .then(r => r.ok ? r.json() : null).catch(() => null),
      ),
    ])
    const currentBlock = Number(BigInt(bnRes?.result ?? '0x0'))
    const fromBlock24h = '0x' + Math.max(0, currentBlock - 195_000).toString(16)

    const allPools: CurvePool[] = []
    for (const data of poolFetches) allPools.push(...(data?.data?.poolData ?? []))
    if (allPools.length === 0) return []

    const balanceCalls = allPools.map((pool, i) => ({
      jsonrpc: '2.0', id: i, method: 'eth_call',
      params: [{ to: pool.lpTokenAddress ?? pool.address, data: '0x70a08231' + paddedAddr }, 'latest'],
    }))
    const feeCalls = allPools.map((pool, i) => ({
      jsonrpc: '2.0', id: i + 1000, method: 'eth_call',
      params: [{ to: pool.address, data: '0xddca3f43' }, 'latest'],
    }))

    const [rpcRes, feeRes, logsRes] = await Promise.all([
      rpcBatch(balanceCalls, TIMEOUT.NORMAL),
      rpcBatch(feeCalls, TIMEOUT.FAST),
      rpcBatch([{
        jsonrpc: '2.0', id: 9999, method: 'eth_getLogs',
        params: [{
          fromBlock: fromBlock24h, toBlock: 'latest',
          address: allPools.map(p => p.address),
          topics: [[TE_CLASSIC, TE_NG]],
        }],
      }], TIMEOUT.SLOW),
    ])

    // 24h volume per pool
    const logsResult = logsRes.find(r => r.id === 9999)?.result
    const logs: CurveLog[] = Array.isArray(logsResult) ? logsResult : []
    const volumeByPool: Record<string, number> = {}
    for (const lg of logs) {
      const poolAddr = lg.address?.toLowerCase()
      if (!poolAddr) continue
      const pool = allPools.find(p => p.address.toLowerCase() === poolAddr)
      if (!pool) continue
      try {
        const data = lg.data?.slice(2) ?? ''
        if (data.length < 128) continue
        const soldId     = Number(BigInt('0x' + data.slice(0, 64)))
        const tokensSold = BigInt('0x' + data.slice(64, 128))
        const decimals   = Number(pool.coins?.[soldId]?.decimals ?? 18)
        volumeByPool[poolAddr] = (volumeByPool[poolAddr] ?? 0) + Number(tokensSold) / Math.pow(10, decimals)
      } catch { /* skip */ }
    }

    const aprByPool: Record<string, number> = {}
    allPools.forEach((pool, i) => {
      const tvl = Number(pool.usdTotalExcludingBasePool ?? pool.usdTotal ?? 0)
      if (tvl <= 0) return
      const feeRaw  = decodeUint(feeRes.find(r => r.id === i + 1000)?.result ?? '0x')
      const feeRate = Number(feeRaw) / 1e10
      const vol24h  = volumeByPool[pool.address?.toLowerCase()] ?? 0
      if (vol24h > 0 && feeRate > 0) {
        aprByPool[pool.address?.toLowerCase()] = (vol24h * feeRate * 365 / tvl) * 100
      }
    })

    const positions: DefiPosition[] = []
    for (let i = 0; i < allPools.length; i++) {
      const result = rpcRes.find(r => r.id === i)?.result ?? '0x'
      if (!result || result === '0x' || result === '0x' + '0'.repeat(64)) continue
      const balanceRaw = BigInt(result)
      if (balanceRaw === 0n) continue

      const pool = allPools[i]
      const totalSupplyRaw = BigInt(pool.totalSupply ?? '0')
      const lpPrice = Number(pool.lpTokenPrice ?? 0)
      const userBalFloat = Number(balanceRaw) / 1e18
      const netValueUSD = lpPrice > 0
        ? userBalFloat * lpPrice
        : totalSupplyRaw > 0n
          ? (Number(balanceRaw) / Number(totalSupplyRaw)) * Number(pool.usdTotalExcludingBasePool ?? pool.usdTotal ?? 0)
          : 0
      if (netValueUSD < 0.01) continue

      const coins  = pool.coins?.map(c => c.symbol) ?? []
      const poolId = pool.id ?? pool.address
      positions.push({
        protocol: 'Curve',
        type:     'liquidity',
        logo:     'https://icons.llamao.fi/icons/protocols/curve-dex?w=48&h=48',
        url:      `https://curve.finance/dex/ink/pools/${poolId}/deposit`,
        chain:    'Ink',
        label:    pool.name ?? coins.join('/'),
        tokens:   coins,
        amountUSD: netValueUSD,
        apy: aprByPool[pool.address?.toLowerCase()] ?? 0,
        netValueUSD,
        inRange: null,
      })
    }
    return positions
  } catch (e) {
    log.error('defi', 'Curve error', redactError(e))
    return []
  }
}
