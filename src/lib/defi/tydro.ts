/**
 * tydro.ts — Aave V3 fork on Ink. Fetches a user's supply/borrow positions
 * across all reserves with their RAY supply APR and on-chain account data.
 */

import { rpcBatch, TYDRO_DATA_PROVIDER } from '@/lib/ink'
import { log, redactError } from '@/lib/log'
import { TIMEOUT, RPC } from '@/lib/constants'
import { ethCall, decodeUint, getTokenPricesUSD, TOKEN_INFO } from './utils'
import type { DefiPosition, DefiSupplyEntry, DefiBorrowEntry } from './types'

const TYDRO_POOL_PROVIDER = '0x4172E6aAEC070ACB31aaCE343A58c93E4C70f44D'
const TYDRO_LOGO = 'https://icons.llamao.fi/icons/protocols/tydro?w=48&h=48'
const TYDRO_URL  = 'https://app.tydro.com'

interface MutableTokenInfo { symbol: string; decimals: number }

export async function fetchTydro(user: string): Promise<DefiPosition[]> {
  try {
    // Step 1: Get Pool address from PoolAddressesProvider.getPool()
    const [poolRes] = await rpcBatch([ethCall(TYDRO_POOL_PROVIDER, '0x026b1d5f', 1)])
    const poolHex = poolRes?.result
    if (!poolHex || poolHex === '0x' || poolHex.length < 42) return []
    const poolAddress = '0x' + poolHex.slice(2).slice(-40).toLowerCase()

    // Step 2: Get reserves from Pool.getReservesList()
    const [reservesRes] = await rpcBatch([ethCall(poolAddress, '0xd1946dbc', 2)])
    if (!reservesRes?.result || reservesRes.result === '0x') return []

    // Decode address[] (ABI-encoded dynamic array)
    const hex    = reservesRes.result.slice(2)
    const offset = Number(BigInt('0x' + hex.slice(0, 64)))
    const count  = Number(BigInt('0x' + hex.slice(offset * 2, offset * 2 + 64)))
    if (count === 0 || count > RPC.MAX_RESERVES) return []

    const reserves: string[] = []
    for (let i = 0; i < count; i++) {
      const start = (offset + 1 + i) * 64
      reserves.push(('0x' + hex.slice(start + 24, start + 64)).toLowerCase())
    }

    // Request-scoped token info: starts as a clone of the frozen module map
    // and may receive entries fetched on-chain for unknown reserves.
    const localTokenInfo: Record<string, MutableTokenInfo> = { ...TOKEN_INFO }
    const userPadded = user.slice(2).toLowerCase().padStart(64, '0')
    const calls: ReturnType<typeof ethCall>[] = [
      // Pool.getUserAccountData(user) → id=100
      ethCall(poolAddress, '0xbf92857c' + userPadded, 100),
    ]
    // ProtocolDataProvider.getUserReserveData(asset, user) → id=200+i
    for (let i = 0; i < reserves.length; i++) {
      const assetPad = reserves[i].slice(2).padStart(64, '0')
      calls.push(ethCall(TYDRO_DATA_PROVIDER, '0x28dd2d01' + assetPad + userPadded, 200 + i))
    }
    // For unknown tokens, fetch symbol() and decimals()
    const unknowns = reserves.filter(r => !localTokenInfo[r])
    for (let i = 0; i < unknowns.length; i++) {
      calls.push(ethCall(unknowns[i], '0x95d89b41', 300 + i * 2))  // symbol()
      calls.push(ethCall(unknowns[i], '0x313ce567', 301 + i * 2))  // decimals()
    }
    const allRes = await rpcBatch(calls, TIMEOUT.NORMAL)

    // Resolve unknown tokens into the local map (never mutate the module-level TOKEN_INFO)
    for (let i = 0; i < unknowns.length; i++) {
      const symR = allRes.find(r => r.id === 300 + i * 2)
      const decR = allRes.find(r => r.id === 301 + i * 2)
      if (symR?.result && symR.result.length > 130 && decR?.result) {
        try {
          const sh  = symR.result.slice(2)
          const off = Number(BigInt('0x' + sh.slice(0, 64))) * 2
          const len = Number(BigInt('0x' + sh.slice(off, off + 64)))
          const sym = Buffer.from(sh.slice(off + 64, off + 64 + len * 2), 'hex')
            .toString('utf8')
            .replace(/\0/g, '')
            .replace(/[<>&"'`]/g, '')  // strip HTML/injection chars from on-chain data
            .trim()
            .slice(0, 20)
          const dec = Number(decodeUint(decR.result))
          if (sym && dec >= 0 && dec <= 18) localTokenInfo[unknowns[i]] = { symbol: sym, decimals: dec }
        } catch { /* skip */ }
      }
    }

    // Parse getUserAccountData (6 × 32 bytes), base currency USD with 8 decimals
    const acctRes = allRes.find(r => r.id === 100)
    let totalCollateralUSD = 0, totalDebtUSD = 0, healthFactor: number | null = null
    if (acctRes?.result && acctRes.result.length >= 2 + 6 * 64) {
      const d = acctRes.result.slice(2)
      totalCollateralUSD = Number(BigInt('0x' + d.slice(0, 64)))   / 1e8
      totalDebtUSD       = Number(BigInt('0x' + d.slice(64, 128))) / 1e8
      const hf = BigInt('0x' + d.slice(320, 384))
      healthFactor = hf > 0n && hf < BigInt('0xffffffffffffffffffffff') ? Number(hf) / 1e18 : null
    }

    if (totalCollateralUSD < 0.01 && totalDebtUSD < 0.01) return []

    // Parse per-reserve getUserReserveData (9 values × 32 bytes)
    const supply: DefiSupplyEntry[] = []
    const borrow: DefiBorrowEntry[] = []
    const symbolsForPrice: string[] = []

    for (let i = 0; i < reserves.length; i++) {
      const r = allRes.find(x => x.id === 200 + i)
      if (!r?.result || r.result === '0x' || r.result.length < 2 + 9 * 64) continue
      const d = r.result.slice(2)

      const aTokenBal  = BigInt('0x' + d.slice(0,   64))
      const stableDebt = BigInt('0x' + d.slice(64,  128))
      const varDebt    = BigInt('0x' + d.slice(128, 192))
      const liqRate    = BigInt('0x' + d.slice(384, 448))

      const info = localTokenInfo[reserves[i]] ?? { symbol: reserves[i].slice(0, 8), decimals: 18 }
      const dec  = Math.pow(10, info.decimals)

      const supAmt  = Number(aTokenBal) / dec
      const debtAmt = (Number(stableDebt) + Number(varDebt)) / dec
      const supApy  = Number(liqRate) / 1e27 * 100  // RAY → %

      if (supAmt > 0.001) {
        supply.push({ symbol: info.symbol, amount: supAmt, amountUSD: 0, apy: Math.round(supApy * 100) / 100 })
        if (!symbolsForPrice.includes(info.symbol)) symbolsForPrice.push(info.symbol)
      }
      if (debtAmt > 0.001) {
        borrow.push({ symbol: info.symbol, amount: debtAmt, amountUSD: 0, apr: 0 })
        if (!symbolsForPrice.includes(info.symbol)) symbolsForPrice.push(info.symbol)
      }
    }

    const prices = await getTokenPricesUSD(symbolsForPrice)
    for (const s of supply) s.amountUSD = s.amount * (prices[s.symbol] ?? 0)
    for (const b of borrow) b.amountUSD = b.amount * (prices[b.symbol] ?? 0)

    const tokens = [...new Set([...supply.map(s => s.symbol), ...borrow.map(b => b.symbol)])]
    return [{
      protocol: 'Tydro',
      type:     'lending',
      logo:     TYDRO_LOGO,
      url:      TYDRO_URL,
      chain:    'Ink',
      label:    tokens.join(' / ') || 'Tydro Lending',
      supply,
      collateral: [],
      borrow,
      totalCollateralUSD,
      totalDebtUSD,
      netValueUSD: totalCollateralUSD - totalDebtUSD,
      healthFactor,
    }]
  } catch (e) {
    log.error('defi', 'Tydro error', redactError(e))
    return []
  }
}
