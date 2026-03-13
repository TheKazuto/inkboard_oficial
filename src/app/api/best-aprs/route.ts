import { NextResponse } from 'next/server'
import { decodeAbiParameters, type Abi } from 'viem'
import { INK_RPC } from '@/lib/ink'
import { kvGet, kvSet } from '@/lib/kvCache'

export const revalidate = 0

// ─── Types ──────────────────────────────────────────────────────────────────
export interface AprEntry {
  protocol:   string
  logo:       string
  url:        string
  tokens:     string[]
  label:      string
  apr:        number
  tvl:        number
  type:       'pool' | 'vault' | 'lend'
  isStable:   boolean
}

// ─── Stablecoin classification ──────────────────────────────────────────────
const STABLECOINS = new Set([
  'USDC', 'USDC.E', 'USDT', 'USDT0', 'DAI', 'FRAX', 'FRXUSD', 'SFRXUSD',
  'CRVUSD', 'BUSD', 'TUSD', 'LUSD', 'MIM', 'USD1', 'LVUSD', 'USDE', 'SUSDE',
  'DOLA', 'GUSD', 'SUSD', 'USDP', 'PYUSD', 'FDUSD', 'USDG', 'OUSDT',
  'OUSD', 'OUSDM',
])

function isStable(sym: string): boolean {
  return STABLECOINS.has(sym.toUpperCase().replace('₮', 'T'))
}
function allStable(tokens: string[]): boolean {
  return tokens.length > 0 && tokens.every(isStable)
}

// ─── Protocol metadata (DefiLlama project slug → display info) ──────────────
const NADO_LOGO = '/nado-logo.jpg'

const PROTOCOL_META: Record<string, { name: string; logo: string; urlBase: string }> = {
  'velodrome-v3':   { name: 'Velodrome V3', logo: 'https://icons.llamao.fi/icons/protocols/velodrome-v2?w=48&h=48', urlBase: 'https://velodrome.finance/liquidity?filters=Ink' },
  'velodrome-v2':   { name: 'Velodrome V2', logo: 'https://icons.llamao.fi/icons/protocols/velodrome-v2?w=48&h=48', urlBase: 'https://velodrome.finance/liquidity?filters=Ink' },
  'velodrome':      { name: 'Velodrome',    logo: 'https://icons.llamao.fi/icons/protocols/velodrome-v2?w=48&h=48', urlBase: 'https://velodrome.finance/liquidity?filters=Ink' },
  'curve-dex':      { name: 'Curve',        logo: 'https://icons.llamao.fi/icons/protocols/curve-dex?w=48&h=48',    urlBase: 'https://curve.fi/#/ink/pools' },
  'tydro':          { name: 'Tydro',        logo: 'https://icons.llamao.fi/icons/protocols/tydro?w=48&h=48',       urlBase: 'https://app.tydro.com' },
  'inkyswap':       { name: 'InkySwap',     logo: 'https://icons.llamao.fi/icons/protocols/inkyswap?w=48&h=48',    urlBase: 'https://inkyswap.com/liquidity' },
  'nado':           { name: 'Nado',         logo: NADO_LOGO,                                                       urlBase: 'https://app.nado.xyz/vault' },
}

function inferType(project: string, poolMeta: string | null): 'pool' | 'vault' | 'lend' {
  const p = project.toLowerCase(), m = (poolMeta ?? '').toLowerCase()
  if (p.includes('tydro') || m.includes('lend') || m.includes('supply') || m.includes('borrow')) return 'lend'
  if (p.includes('nado') || m.includes('vault') || m.includes('auto') || m.includes('nlp')) return 'vault'
  return 'pool'
}

// ─── Velodrome on Ink (chain 57073) ─────────────────────────────────────────
const INK_RPC_ALT  = 'https://ink.drpc.org'
const VELO_URL     = 'https://velodrome.finance/liquidity?chain=57073'
const GECKO_BASE   = 'https://api.geckoterminal.com/api/v2'
const SECONDS_YEAR = 86400 * 365
const XVELO_INK    = '0x7f9AdFbd38b669F03d1d11000Bc76b9AaEA28A81'
const VELO_DEX_IDS = ['velodrome-finance-v2-ink', 'velodrome-finance-slipstream-ink']

// LP Sugar contract — deployed on Ink at chain 57073
// Source: https://velodrome.finance bundle → VITE_LP_SUGAR_ADDRESS_57073
// Function: all(uint256 limit, uint256 offset, uint256 filter) → DynArray[Lp, 500]
// Selector: keccak256("all(uint256,uint256,uint256)")[:4] = 0x48523ff0
const LP_SUGAR    = '0x46e07c9b4016f8E5c3cD0b2fd20147A4d0972120' as const
const SUGAR_LIMIT = 50

// ─── InkySwap on Ink ────────────────────────────────────────────────────────
const INKY_URL      = 'https://inkyswap.com/liquidity'
const INKY_API_BASE = 'https://inkyswap.com/api'

// ─── Nado NLP Vault ──────────────────────────────────────────────────────────
// gateway.prod.nado.xyz blocks datacenter IPs unless Accept-Encoding is set.
// Both endpoints require: Accept-Encoding: gzip, br, deflate
const NADO_GATEWAY = 'https://gateway.prod.nado.xyz'
const NADO_ARCHIVE = 'https://archive.prod.nado.xyz/v1'
// Required headers — gateway returns {"reason":"ip_query_only","blocked":true} without them
// and archive returns {"reason":"Invalid compression headers..."} without Accept-Encoding
const NADO_HEADERS = {
  'Content-Type':    'application/json',
  'Accept':          'application/json',
  'Accept-Encoding': 'gzip, br, deflate',
}

// ─── LP Sugar ABI ────────────────────────────────────────────────────────────
const LP_COMPONENTS = [
  { name: 'lp',              type: 'address'  },
  { name: 'symbol',          type: 'string'   },
  { name: 'decimals',        type: 'uint8'    },
  { name: 'liquidity',       type: 'uint256'  },
  { name: 'type',            type: 'int24'    },  // >0 = CL tickSpacing, <0 = V2 stable, 0 = V2 volatile
  { name: 'tick',            type: 'int24'    },
  { name: 'sqrt_ratio',      type: 'uint160'  },
  { name: 'token0',          type: 'address'  },
  { name: 'reserve0',        type: 'uint256'  },
  { name: 'staked0',         type: 'uint256'  },
  { name: 'token1',          type: 'address'  },
  { name: 'reserve1',        type: 'uint256'  },
  { name: 'staked1',         type: 'uint256'  },
  { name: 'gauge',           type: 'address'  },
  { name: 'gauge_liquidity', type: 'uint256'  },
  { name: 'gauge_alive',     type: 'bool'     },
  { name: 'fee',             type: 'address'  },
  { name: 'bribe',           type: 'address'  },
  { name: 'factory',         type: 'address'  },
  { name: 'emissions',       type: 'uint256'  },  // XVELO wei/sec for current epoch
  { name: 'emissions_token', type: 'address'  },
  { name: 'emissions_cap',   type: 'uint256'  },
  { name: 'pool_fee',        type: 'uint256'  },
  { name: 'unstaked_fee',    type: 'uint256'  },
  { name: 'token0_fees',     type: 'uint256'  },
  { name: 'token1_fees',     type: 'uint256'  },
  { name: 'locked',          type: 'uint256'  },
  { name: 'emerging',        type: 'uint256'  },
  { name: 'created_at',      type: 'uint32'   },
  { name: 'nfpm',            type: 'address'  },
  { name: 'alm',             type: 'address'  },
  { name: 'root',            type: 'address'  },
] as const

interface SugarPool {
  lp:         string
  symbol:     string
  token0:     string
  token1:     string
  emissions:  number  // XVELO/sec already /1e18
  gaugeAlive: boolean
  isCL:       boolean
  isStable:   boolean
}

// ─── Fetch all pools from LP Sugar (paginated) ───────────────────────────────
async function fetchSugarPools(): Promise<SugarPool[]> {
  const all: SugarPool[] = []
  let offset = 0

  while (true) {
    const data = (
      '0x48523ff0'
      + SUGAR_LIMIT.toString(16).padStart(64, '0')
      + offset.toString(16).padStart(64, '0')
      + '0'.repeat(64)
    ) as `0x${string}`

    let result = ''
    for (const rpc of [INK_RPC, INK_RPC_ALT]) {
      try {
        const res = await fetch(rpc, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: LP_SUGAR, data }, 'latest'] }),
          signal: AbortSignal.timeout(20_000),
        })
        const json = await res.json()
        if (json.result && json.result.length > 10) { result = json.result; break }
      } catch { continue }
    }
    if (!result) break

    let batch: readonly { lp: string; symbol: string; type: number; token0: string; token1: string; gauge_alive: boolean; emissions: bigint; [k: string]: unknown }[]
    try {
      const decoded = decodeAbiParameters(
        [{ type: 'tuple[]', components: LP_COMPONENTS }],
        result as `0x${string}`
      )
      batch = decoded[0] as typeof batch
    } catch (e) {
      console.error('[best-aprs] Sugar decode error at offset', offset, e)
      break
    }

    for (const p of batch) {
      const lpType = Number(p.type)
      all.push({
        lp:         (p.lp as string).toLowerCase(),
        symbol:     p.symbol as string,
        token0:     (p.token0 as string).toLowerCase(),
        token1:     (p.token1 as string).toLowerCase(),
        emissions:  Number(p.emissions as bigint) / 1e18,
        gaugeAlive: p.gauge_alive as boolean,
        isCL:       lpType > 0,
        isStable:   lpType < 0,
      })
    }

    if (batch.length < SUGAR_LIMIT) break
    offset += SUGAR_LIMIT
  }

  return all
}

// ─── XVELO price (GeckoTerminal → CoinGecko fallback) ────────────────────────
async function fetchXveloPrice(): Promise<number> {
  try {
    const res = await fetch(`${GECKO_BASE}/simple/networks/ink/token_price/${XVELO_INK}`, { signal: AbortSignal.timeout(8_000), headers: { Accept: 'application/json' } })
    if (res.ok) {
      const price = parseFloat((await res.json())?.data?.attributes?.token_prices?.[XVELO_INK.toLowerCase()] ?? '0')
      if (price > 0) return price
    }
  } catch { /* fall through */ }
  try {
    const cgHeaders: Record<string, string> = { 'Accept': 'application/json' }
    const cgKey = process.env.COINGECKO_API_KEY
    if (cgKey) cgHeaders['x-cg-demo-api-key'] = cgKey
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=velodrome-finance&vs_currencies=usd', { headers: cgHeaders, signal: AbortSignal.timeout(8_000) })
    if (res.ok) {
      const price = (await res.json())?.['velodrome-finance']?.usd ?? 0
      if (price > 0) return price
    }
  } catch { /* skip */ }
  return 0
}

// ─── GeckoTerminal: TVL + vol24h for all Velodrome pools on Ink ──────────────
interface GeckoPool { address: string; base: string; quote: string; tvl: number; vol24h: number; isCL: boolean; isStable: boolean; feeApr: number }

async function fetchGeckoPools(): Promise<GeckoPool[]> {
  const out: GeckoPool[] = [], seen = new Set<string>()
  const FEE_STABLE = 0.0001, FEE_DEFAULT = 0.003

  const pageFetches: Promise<{ dexId: string; pools: any[]; included: any[] }>[] = []
  for (const dexId of VELO_DEX_IDS) {
    for (let page = 1; page <= 3; page++) {
      pageFetches.push(
        fetch(
          `${GECKO_BASE}/networks/ink/dexes/${dexId}/pools?page=${page}&sort=h24_volume_usd_desc&include=base_token,quote_token`,
          { signal: AbortSignal.timeout(10_000), headers: { Accept: 'application/json' } }
        )
          .then(r => r.ok ? r.json() : null)
          .then(json => ({ dexId, pools: json?.data ?? [], included: json?.included ?? [] }))
          .catch(() => ({ dexId, pools: [], included: [] }))
      )
    }
  }

  const results = await Promise.all(pageFetches)

  const tokenSymbols = new Map<string, string>()
  for (const { included } of results)
    for (const inc of included)
      if (inc.type === 'token' && inc.attributes?.symbol)
        tokenSymbols.set(inc.id, inc.attributes.symbol)

  for (const { dexId, pools } of results) {
    const isCL = dexId.includes('slipstream')
    for (const pool of pools) {
      const attrs = pool.attributes ?? {}
      const addr = (attrs.address ?? '').toLowerCase()
      if (!addr || seen.has(addr)) continue
      seen.add(addr)

      const poolName = attrs.name ?? ''
      let base  = tokenSymbols.get(pool.relationships?.base_token?.data?.id ?? '') ?? ''
      let quote = tokenSymbols.get(pool.relationships?.quote_token?.data?.id ?? '') ?? ''

      if ((!base || !quote) && poolName.includes('/')) {
        const nameClean = poolName.replace(/\s*\d+\.?\d*%\s*$/, '').trim()
        const [p0, p1] = nameClean.split('/').map((s: string) => s.trim())
        if (!base && p0) base = p0
        if (!quote && p1) quote = p1
      }
      if (!base || !quote) continue

      base  = base.replace('₮', 'T')
      quote = quote.replace('₮', 'T')

      const tvl    = parseFloat(attrs.reserve_in_usd ?? '0')
      const vol24h = parseFloat(attrs.volume_usd?.h24 ?? '0')
      if (tvl < 50) continue

      const pairIsStable = poolName.toLowerCase().includes('stable') || allStable([base, quote])
      const feeApr = tvl > 0 ? (vol24h * (pairIsStable ? FEE_STABLE : FEE_DEFAULT) * 365 / tvl) * 100 : 0

      out.push({ address: addr, base, quote, tvl, vol24h, isCL, isStable: pairIsStable, feeApr })
    }
  }

  return out
}

// ─── Combined Velodrome: Sugar emissions (on-chain) + GeckoTerminal TVL/fees ─
async function fetchVelodromeData(): Promise<AprEntry[]> {
  const [xveloPriceResult, geckoResult, sugarResult] = await Promise.allSettled([
    fetchXveloPrice(),
    fetchGeckoPools(),
    fetchSugarPools(),
  ])

  const xveloPrice = xveloPriceResult.status === 'fulfilled' ? xveloPriceResult.value : 0
  const geckoPools = geckoResult.status   === 'fulfilled' ? geckoResult.value   : []
  const sugarPools = sugarResult.status   === 'fulfilled' ? sugarResult.value   : []

  if (sugarResult.status === 'rejected')
    console.error('[best-aprs] Sugar fetch failed:', sugarResult.reason)
  if (geckoResult.status === 'rejected')
    console.error('[best-aprs] GeckoTerminal fetch failed:', geckoResult.reason)

  const emissionsMap = new Map<string, number>()
  for (const p of sugarPools) {
    if (p.gaugeAlive && p.emissions > 0) emissionsMap.set(p.lp, p.emissions)
  }

  if (geckoPools.length === 0) {
    console.warn('[best-aprs] No GeckoTerminal pools — Velodrome skipped')
    return []
  }

  const out: AprEntry[] = []
  for (const g of geckoPools) {
    const xveloPerSec = emissionsMap.get(g.address) ?? 0
    const emissionApr = (xveloPerSec > 0 && xveloPrice > 0 && g.tvl > 0)
      ? (xveloPerSec * xveloPrice * SECONDS_YEAR / g.tvl) * 100
      : 0
    const totalApr = emissionApr + g.feeApr

    if (totalApr <= 0 && g.tvl < 500) continue
    if (totalApr > 50_000) continue

    const suffix = g.isStable ? ' (stable)' : g.isCL ? ' (CL)' : ''
    out.push({
      protocol: g.isCL ? 'Velodrome CL' : 'Velodrome',
      logo:     'https://icons.llamao.fi/icons/protocols/velodrome-v2?w=48&h=48',
      url:      VELO_URL,
      tokens:   [g.base, g.quote],
      label:    `${g.base}-${g.quote}${suffix}`,
      apr:      Math.round(totalApr * 100) / 100,
      tvl:      g.tvl,
      type:     'pool',
      isStable: g.isStable,
    })
  }

  return out
}

// ─── InkySwap: native /api/pairs ─────────────────────────────────────────────
async function fetchInkySwapData(): Promise<AprEntry[]> {
  const out: AprEntry[] = []
  try {
    const res = await fetch(`${INKY_API_BASE}/pairs`, {
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return out
    const data = await res.json()
    const pairs: any[] = Array.isArray(data) ? data : (data?.pairs ?? data?.data ?? [])

    for (const p of pairs) {
      const base  = p.token0?.symbol ?? ''
      const quote = p.token1?.symbol ?? ''
      if (!base || !quote) continue

      const tvl    = parseFloat(p.liquidity_usd ?? p.tvl_usd ?? p.tvl ?? '0')
      const aprRaw = parseFloat(p.apr ?? p.total_apr ?? '0')
      if (tvl < 100 || aprRaw <= 0 || aprRaw > 50_000) continue

      out.push({
        protocol: 'InkySwap',
        logo:     'https://icons.llamao.fi/icons/protocols/inkyswap?w=48&h=48',
        url:      INKY_URL,
        tokens:   [base, quote],
        label:    `${base}-${quote}`,
        apr:      Math.round(aprRaw * 100) / 100,
        tvl,
        type:     'pool',
        isStable: allStable([base, quote]),
      })
    }
  } catch (e) { console.error('[best-aprs] InkySwap error:', e) }
  return out
}

// ─── Nado NLP Vault ──────────────────────────────────────────────────────────
// IMPORTANT: Both endpoints require `Accept-Encoding: gzip, br, deflate`.
// The gateway returns {"reason":"ip_query_only","blocked":true} without it,
// and the archive returns a compression header error.
// The fetch() API in Cloudflare Workers does NOT add Accept-Encoding automatically.
async function fetchNadoVault(): Promise<AprEntry[]> {
  try {
    const now = Math.floor(Date.now() / 1000)
    const thirtyDaysAgo = now - 30 * 86400

    const [poolRes, snapNowRes, snapOldRes] = await Promise.all([
      fetch(`${NADO_GATEWAY}/v1/query?type=nlp_pool_info`, {
        headers: NADO_HEADERS,
        signal: AbortSignal.timeout(10_000),
      }).then(r => r.ok ? r.json() : null).catch(() => null),

      fetch(NADO_ARCHIVE, {
        method: 'POST',
        headers: NADO_HEADERS,
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ nlp_snapshots: { limit: 1 } }),
      }).then(r => r.ok ? r.json() : null).catch(() => null),

      fetch(NADO_ARCHIVE, {
        method: 'POST',
        headers: NADO_HEADERS,
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ nlp_snapshots: { limit: 1, max_time: thirtyDaysAgo } }),
      }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])

    const pools = poolRes?.data?.nlp_pools ?? []
    if (pools.length === 0) return []

    // Extract NLP supply + price from pool info
    let nlpSupply = 0, nlpPriceFromPool = 0
    for (const pool of pools) {
      for (const sp of (pool.subaccount_info?.spot_products ?? [])) {
        if (sp.product_id === 11) {
          nlpSupply        = parseFloat(sp.state?.total_deposits_normalized ?? '0') / 1e18
          nlpPriceFromPool = parseFloat(sp.oracle_price_x18 ?? '0') / 1e18
          break
        }
      }
      if (nlpSupply > 0) break
    }

    // TVL from latest snapshot (more accurate) or fallback to supply × price
    const latestSnap = (snapNowRes?.snapshots ?? [])[0]
    const totalTVL = latestSnap
      ? parseFloat(latestSnap.tvl ?? '0') / 1e18
      : nlpSupply * nlpPriceFromPool
    if (totalTVL < 100) return []

    // 30-day rolling APR from NLP oracle price
    let apr = 0
    const currentPrice = latestSnap
      ? parseFloat(latestSnap.oracle_price_x18 ?? '0') / 1e18
      : nlpPriceFromPool
    const oldSnap = (snapOldRes?.snapshots ?? [])[0]
    if (oldSnap) {
      const oldPrice = parseFloat(oldSnap.oracle_price_x18 ?? '0') / 1e18
      if (oldPrice > 0 && currentPrice > oldPrice) {
        const oldTs       = parseInt(oldSnap.timestamp ?? '0')
        const newTs       = latestSnap ? parseInt(latestSnap.timestamp ?? '0') : now
        const daysBetween = Math.max(1, (newTs - oldTs) / 86400)
        apr = ((currentPrice - oldPrice) / oldPrice) * (365 / daysBetween) * 100
      }
    }
    // Fallback: inception APR
    if (apr <= 0 && currentPrice > 1.0) {
      const LAUNCH      = new Date('2025-11-20').getTime()
      const daysSinceLaunch = Math.max(1, (Date.now() - LAUNCH) / 86_400_000)
      apr = (currentPrice - 1.0) * (365 / daysSinceLaunch) * 100
    }

    return [{
      protocol: 'Nado',
      logo:     NADO_LOGO,
      url:      'https://app.nado.xyz/vault',
      tokens:   ['USDT0'],
      label:    'NLP Vault',
      apr:      Math.round(apr * 100) / 100,
      tvl:      totalTVL,
      type:     'vault',
      isStable: false,
    }]
  } catch (e) { console.error('[best-aprs] Nado error:', e); return [] }
}

// ─── DefiLlama (Tydro + Curve on Ink) ────────────────────────────────────────
const LLAMA_SLUGS = new Set(['tydro', 'curve-dex'])

async function fetchDefiLlama(): Promise<AprEntry[]> {
  const out: AprEntry[] = []
  try {
    const res = await fetch('https://yields.llama.fi/pools', { signal: AbortSignal.timeout(15_000), headers: { Accept: 'application/json' } })
    if (!res.ok) { console.error(`[best-aprs] DefiLlama HTTP ${res.status}`); return out }

    const pools: any[] = (await res.json())?.data ?? []
    const target = pools.filter((p: any) =>
      p.chain?.toLowerCase() === 'ink' && LLAMA_SLUGS.has(p.project)
    )

    for (const p of target) {
      const project = p.project ?? '', symbol = p.symbol ?? ''
      const apy = p.apy ?? 0, tvl = p.tvlUsd ?? 0
      if (tvl < 500 || apy <= 0 || apy > 50_000) continue

      const tokens = symbol.split(/[-\/]/).map((t: string) => t.trim()).filter(Boolean)
      const meta = PROTOCOL_META[project] ?? {
        name: project.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        logo: `https://icons.llamao.fi/icons/protocols/${project}?w=48&h=48`, urlBase: '#',
      }
      out.push({
        protocol: meta.name, logo: meta.logo, url: meta.urlBase, tokens, label: symbol,
        apr: apy, tvl, type: inferType(project, p.poolMeta ?? null), isStable: allStable(tokens),
      })
    }
  } catch (e) { console.error('[best-aprs] DefiLlama error:', e) }
  return out
}

// ─── Cache + GET ──────────────────────────────────────────────────────────────

const SOFT_TTL = 3 * 60 * 1000
const HARD_TTL = 10 * 60

let inflight: Promise<AprEntry[]> | null = null

async function fetchAllAprs(): Promise<AprEntry[]> {
  const [v, i, n, l] = await Promise.allSettled([fetchVelodromeData(), fetchInkySwapData(), fetchNadoVault(), fetchDefiLlama()])
  const velo  = v.status === 'fulfilled' ? v.value : []
  const inky  = i.status === 'fulfilled' ? i.value : []
  const nado  = n.status === 'fulfilled' ? n.value : []
  const llama = l.status === 'fulfilled' ? l.value : []
  if (v.status === 'rejected') console.error('[best-aprs] Velodrome failed:', v.reason)
  if (i.status === 'rejected') console.error('[best-aprs] InkySwap failed:', i.reason)
  if (n.status === 'rejected') console.error('[best-aprs] Nado failed:', n.reason)
  if (l.status === 'rejected') console.error('[best-aprs] DefiLlama failed:', l.reason)
  const all = [...velo, ...inky, ...nado, ...llama]
  all.sort((a, b) => b.apr - a.apr || b.tvl - a.tvl)
  return all
}

export async function GET() {
  const cached = await kvGet<AprEntry[]>('best-aprs', SOFT_TTL)

  if (cached.data && cached.fresh) {
    return NextResponse.json(cached.data, { headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=60' } })
  }

  if (!inflight) inflight = fetchAllAprs().finally(() => { inflight = null })

  try {
    const data = await inflight
    await kvSet('best-aprs', data, HARD_TTL)
    return NextResponse.json(data, { headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=60' } })
  } catch (e) {
    console.error('[best-aprs] Fatal:', e)
    if (cached.data) return NextResponse.json(cached.data, { headers: { 'X-Cache': 'STALE' } })
    return NextResponse.json([], { status: 502 })
  }
}
