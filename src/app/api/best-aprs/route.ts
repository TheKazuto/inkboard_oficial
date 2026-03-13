// ════════════════════════════════════════════════════════════════════════════
// PATCH para src/app/api/best-aprs/route.ts
//
// 3 alterações cirúrgicas no arquivo atual:
//
//  [1] Adicionar constantes do Tydro logo após NADO_HEADERS = { ... }
//  [2] Substituir fetchDefiLlama() por fetchTydroData() + fetchCurveData()
//  [3] Substituir fetchAllAprs() para usar as novas funções
// ════════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────────
// [1] Adicionar logo após NADO_HEADERS = { ... }
// ─────────────────────────────────────────────────────────────────────────────

// ─── Tydro (Aave V3 fork on Ink) ─────────────────────────────────────────────
// DataProvider.getReserveData(address) returns a tuple where slot 5 = liquidityRate
// in RAY units (1e27). supplyAPR% = liquidityRate / 1e27 * 100
// Merkl API provides extra incentive APRs on top of the native supply rate.
const TYDRO_DATA_PROVIDER = '0x96086C25d13943C80Ff9a19791a40Df6aFC08328' as const
const TYDRO_URL           = 'https://app.tydro.com'
const TYDRO_LOGO          = 'https://icons.llamao.fi/icons/protocols/tydro?w=48&h=48'
const MERKL_URL           = 'https://api.merkl.xyz/v4/opportunities?chainId=57073&mainProtocolId=tydro&campaigns=true&status=LIVE'

// All 12 active reserves — verified via Pool.getReservesList() on 2025-03
const TYDRO_RESERVES: { address: string; symbol: string }[] = [
  { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH'    },
  { address: '0x73e0c0d45e048d25fc26fa3159b0aa04bfa4db98', symbol: 'kBTC'    },
  { address: '0x0200c29006150606b650577bbe7b6248f58470c1', symbol: 'USDT0'   },
  { address: '0xe343167631d89b6ffc58b88d6b7fb0228795491d', symbol: 'USDG'    },
  { address: '0xfc421ad3c883bf9e7c4f42de845c4e4405799e73', symbol: 'GHO'     },
  { address: '0x2d270e6886d130d724215a266106e6832161eaed', symbol: 'USDC'    },
  { address: '0xa3d68b74bf0528fdd07263c60d6488749044914b', symbol: 'weETH'   },
  { address: '0x9f0a74a92287e323eb95c1cd9ecdbeb0e397cae4', symbol: 'wrsETH'  },
  { address: '0x2416092f143378750bb29b79ed961ab195cceea5', symbol: 'ezETH'   },
  { address: '0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2', symbol: 'sUSDe'   },
  { address: '0x5d3a1ff2b6bab83b63cd9ad0787074081a52ef34', symbol: 'USDe'    },
  { address: '0xae4efbc7736f963982aacb17efa37fcbab924cb3', symbol: 'SolvBTC' },
]


// ─────────────────────────────────────────────────────────────────────────────
// [2] Substituir fetchDefiLlama() inteira por estas duas funções
// ─────────────────────────────────────────────────────────────────────────────

// ─── Tydro: on-chain supply APR + Merkl incentives ───────────────────────────
async function fetchTydroData(): Promise<AprEntry[]> {
  // getReserveData(address) = 0x35ea6a75
  const batch = TYDRO_RESERVES.map((r, i) => ({
    jsonrpc: '2.0' as const,
    id: i,
    method: 'eth_call' as const,
    params: [
      { to: TYDRO_DATA_PROVIDER, data: ('0x35ea6a75' + '000000000000000000000000' + r.address.slice(2)) as `0x${string}` },
      'latest',
    ],
  }))

  const [onChainRes, merklRes] = await Promise.allSettled([
    fetch(INK_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
      signal: AbortSignal.timeout(15_000),
    }).then(r => r.ok ? r.json() : null),

    fetch(MERKL_URL, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    }).then(r => r.ok ? r.json() : null).catch(() => null),
  ])

  // Parse supply APRs from on-chain data
  // getReserveData tuple: [0]unbacked [1]accruedToTreasury [2]totalAToken
  // [3]totalStableDebt [4]totalVariableDebt [5]liquidityRate (RAY) [6]variableBorrowRate ...
  const supplyAprs = new Map<string, number>()
  if (onChainRes.status === 'fulfilled' && Array.isArray(onChainRes.value)) {
    for (const item of onChainRes.value) {
      const reserve = TYDRO_RESERVES[item.id]
      if (!reserve || !item.result || item.result === '0x') continue
      try {
        const hex = item.result.slice(2)
        const liquidityRate = BigInt('0x' + hex.slice(5 * 64, 6 * 64))
        supplyAprs.set(reserve.address.toLowerCase(), Number(liquidityRate) / 1e27 * 100)
      } catch { /* skip */ }
    }
  } else {
    console.error('[best-aprs] Tydro on-chain failed:', onChainRes.status === 'rejected' ? onChainRes.reason : 'null')
  }

  // Parse Merkl incentive APRs (keyed by underlying token address)
  const merklAprs = new Map<string, number>()
  if (merklRes.status === 'fulfilled' && Array.isArray(merklRes.value)) {
    for (const opp of merklRes.value) {
      const merklApr = opp.apr ?? 0
      if (merklApr <= 0) continue
      for (const t of (opp.tokens ?? [])) {
        const addr = (t.address ?? '').toLowerCase()
        if (addr) merklAprs.set(addr, (merklAprs.get(addr) ?? 0) + merklApr)
      }
    }
  }

  const out: AprEntry[] = []
  for (const reserve of TYDRO_RESERVES) {
    const key       = reserve.address.toLowerCase()
    const supplyApr = supplyAprs.get(key) ?? 0
    const merklApr  = merklAprs.get(key) ?? 0
    const totalApr  = supplyApr + merklApr
    if (totalApr <= 0) continue

    out.push({
      protocol: 'Tydro',
      logo:     TYDRO_LOGO,
      url:      TYDRO_URL,
      tokens:   [reserve.symbol],
      label:    `${reserve.symbol} Lending`,
      apr:      Math.round(totalApr * 100) / 100,
      tvl:      0,
      type:     'lend',
      isStable: isStable(reserve.symbol),
    })
  }

  return out
}

// ─── Curve on Ink: DefiLlama ──────────────────────────────────────────────────
async function fetchCurveData(): Promise<AprEntry[]> {
  const out: AprEntry[] = []
  try {
    const res = await fetch('https://yields.llama.fi/pools', {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return out

    const pools: any[] = (await res.json())?.data ?? []
    for (const p of pools) {
      if (p.chain?.toLowerCase() !== 'ink' || p.project !== 'curve-dex') continue
      const apy = p.apy ?? 0, tvl = p.tvlUsd ?? 0
      if (tvl < 500 || apy <= 0 || apy > 50_000) continue
      const tokens = (p.symbol ?? '').split(/[-\/]/).map((t: string) => t.trim()).filter(Boolean)
      out.push({
        protocol: 'Curve',
        logo:     'https://icons.llamao.fi/icons/protocols/curve-dex?w=48&h=48',
        url:      'https://curve.fi/#/ink/pools',
        tokens,
        label:    p.symbol ?? '',
        apr:      apy,
        tvl,
        type:     'pool',
        isStable: allStable(tokens),
      })
    }
  } catch (e) { console.error('[best-aprs] Curve error:', e) }
  return out
}


// ─────────────────────────────────────────────────────────────────────────────
// [3] Substituir fetchAllAprs() inteira
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAllAprs(): Promise<AprEntry[]> {
  const [v, i, n, t, c] = await Promise.allSettled([
    fetchVelodromeData(),
    fetchInkySwapData(),
    fetchNadoVault(),
    fetchTydroData(),
    fetchCurveData(),
  ])
  const velo  = v.status === 'fulfilled' ? v.value : []
  const inky  = i.status === 'fulfilled' ? i.value : []
  const nado  = n.status === 'fulfilled' ? n.value : []
  const tydro = t.status === 'fulfilled' ? t.value : []
  const curve = c.status === 'fulfilled' ? c.value : []
  if (v.status === 'rejected') console.error('[best-aprs] Velodrome failed:', v.reason)
  if (i.status === 'rejected') console.error('[best-aprs] InkySwap failed:', i.reason)
  if (n.status === 'rejected') console.error('[best-aprs] Nado failed:', n.reason)
  if (t.status === 'rejected') console.error('[best-aprs] Tydro failed:', t.reason)
  if (c.status === 'rejected') console.error('[best-aprs] Curve failed:', c.reason)
  const all = [...velo, ...inky, ...nado, ...tydro, ...curve]
  all.sort((a, b) => b.apr - a.apr || b.tvl - a.tvl)
  return all
}
