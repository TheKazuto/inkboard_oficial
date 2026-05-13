import { NextRequest, NextResponse } from 'next/server'
import { INK_RPC as RPC, INK_RPC_SECONDARY, KNOWN_TOKENS } from '@/lib/ink'
import { log, redactError } from '@/lib/log'
import { TIMEOUT } from '@/lib/constants'
import { parseEvmAddress, ValidationError, badRequest } from '@/lib/validation'

export const revalidate = 0

// ─── Blockscout API base ────────────────────────────────────────────────────
const BLOCKSCOUT = 'https://explorer.inkonchain.com/api/v2'

// Build TOKEN_MAP from KNOWN_TOKENS for symbol resolution in RPC fallback
const TOKEN_MAP: Record<string, { symbol: string; decimals: number }> = {}
for (const token of KNOWN_TOKENS) {
  TOKEN_MAP[token.contract.toLowerCase()] = {
    symbol: token.symbol,
    decimals: token.decimals,
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────
async function rpc<T = unknown>(method: string, params: unknown[], id = 1): Promise<T | undefined> {
  // Try primary, then fall back to secondary so a single-RPC outage
  // doesn't black out the whole transactions page.
  for (const endpoint of [RPC, INK_RPC_SECONDARY]) {
    try {
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id }),
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT.NORMAL),
      })
      if (!r.ok) continue
      const d = await r.json()
      return d.result as T
    } catch { /* try next */ }
  }
  return undefined
}

interface RpcLog {
  address?:         string
  data?:            string
  topics?:          string[]
  blockNumber:      string
  transactionHash?: string
}

interface RpcBlock {
  number?:    string
  timestamp?: string
}

export async function GET(req: NextRequest) {
  let address: string
  try {
    address = parseEvmAddress(req.nextUrl.searchParams.get('address'))
  } catch (e) {
    return badRequest(e instanceof ValidationError ? e.message : 'Invalid address')
  }

  const addrLower = address.toLowerCase()

  // ── PATH 1: Blockscout v2 API (primary — native Ink explorer) ─────────────
  try {
    const [txRes, tokenRes] = await Promise.all([
      fetch(`${BLOCKSCOUT}/addresses/${address}/transactions?filter=to%7Cfrom`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT.NORMAL),
        headers: { 'Accept': 'application/json' },
      }),
      fetch(`${BLOCKSCOUT}/addresses/${address}/token-transfers?type=ERC-20`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT.NORMAL),
        headers: { 'Accept': 'application/json' },
      }),
    ])

    if (txRes.ok || tokenRes.ok) {
      const txData    = txRes.ok    ? await txRes.json()    : { items: [] }
      const tokenData = tokenRes.ok ? await tokenRes.json() : { items: [] }

      const normalTxs = (txData.items ?? []).map((tx: any) => {
        const from = tx.from?.hash?.toLowerCase() ?? ''
        const val  = tx.value ?? '0'
        return {
          hash: tx.hash,
          type: from === addrLower ? 'send' : 'receive',
          from: tx.from?.hash ?? '',
          to:   tx.to?.hash ?? '',
          valueNative: (Number(val) / 1e18).toFixed(6),
          symbol: 'ETH',
          timestamp: tx.timestamp ? Math.floor(new Date(tx.timestamp).getTime() / 1000) : 0,
          isError: tx.status === 'error' || tx.result === 'error',
          isToken: false,
          functionName: tx.method ?? '',
        }
      })

      const tokenTxs = (tokenData.items ?? []).map((tx: any) => {
        const from     = tx.from?.hash?.toLowerCase() ?? ''
        const token    = tx.token ?? {}
        const decimals = Number(token.decimals ?? 18)
        const rawVal   = tx.total?.value ?? '0'
        return {
          hash: tx.tx_hash,
          type: from === addrLower ? 'send' : 'receive',
          from: tx.from?.hash ?? '',
          to:   tx.to?.hash ?? '',
          valueNative: (Number(rawVal) / Math.pow(10, decimals)).toFixed(decimals <= 6 ? 4 : 6),
          symbol: token.symbol ?? 'TOKEN',
          timestamp: tx.timestamp ? Math.floor(new Date(tx.timestamp).getTime() / 1000) : 0,
          isError: false,
          isToken: true,
          functionName: '',
        }
      })

      // Merge, deduplicate by hash, sort newest first
      const seen = new Set<string>()
      const all = [...normalTxs, ...tokenTxs]
        .filter(tx => {
          if (seen.has(tx.hash)) return false
          seen.add(tx.hash)
          return true
        })
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, 100)

      if (all.length > 0) {
        return NextResponse.json({ transactions: all, source: 'blockscout' })
      }
    }
  } catch (e) {
    log.error('transactions', 'blockscout error', redactError(e))
  }

  // ── PATH 2: RPC — scan recent blocks (last resort) ────────────────────────
  try {
    const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const paddedAddr = '0x000000000000000000000000' + addrLower.slice(2)

    const latestHex = await rpc<string>('eth_blockNumber', [])
    if (!latestHex) throw new Error('no block number')
    const latest = parseInt(latestHex, 16)
    const SCAN_BLOCKS = 5000  // ~2.7h on Ink (2s blocks)
    const fromBlock = '0x' + Math.max(0, latest - SCAN_BLOCKS).toString(16)

    const [logsFromRes, logsToRes, nativeTxsRes] = await Promise.all([
      rpc<RpcLog[]>('eth_getLogs', [{ fromBlock, toBlock: 'latest', topics: [TRANSFER_TOPIC, paddedAddr] }]),
      rpc<RpcLog[]>('eth_getLogs', [{ fromBlock, toBlock: 'latest', topics: [TRANSFER_TOPIC, null, paddedAddr] }]),
      fetchNativeTxs(addrLower, fromBlock, latest),
    ])

    const allLogs = [
      ...((logsFromRes ?? []).map(l => ({ ...l, direction: 'send' as const }))),
      ...((logsToRes   ?? []).map(l => ({ ...l, direction: 'receive' as const }))),
    ]

    const blockNums = [...new Set<string>([
      ...allLogs.map(l => l.blockNumber),
      ...nativeTxsRes.map(t => t.blockNumber),
    ])]

    const blockTimestamps: Record<string, number> = {}
    await Promise.all(blockNums.slice(0, 30).map(async (bn) => {
      const block = await rpc<RpcBlock>('eth_getBlockByNumber', [bn, false])
      if (block?.timestamp) blockTimestamps[bn] = parseInt(block.timestamp, 16)
    }))

    const erc20Txs = allLogs.map((lg) => {
      const contractAddr = lg.address?.toLowerCase() ?? ''
      const tokenInfo    = TOKEN_MAP[contractAddr]
      const decimals     = tokenInfo?.decimals ?? 18
      const rawValue     = lg.data === '0x' || !lg.data ? 0 : Number(BigInt(lg.data))
      return {
        hash: lg.transactionHash ?? '',
        type: lg.direction,
        from: lg.direction === 'send'    ? address : '0x' + (lg.topics?.[1]?.slice(26) ?? ''),
        to:   lg.direction === 'receive' ? address : '0x' + (lg.topics?.[2]?.slice(26) ?? ''),
        valueNative: (rawValue / Math.pow(10, decimals)).toFixed(decimals <= 6 ? 4 : 6),
        symbol: tokenInfo?.symbol ?? 'TOKEN',
        timestamp: blockTimestamps[lg.blockNumber] || 0,
        isError: false, isToken: true, functionName: '',
      }
    })

    const nativeTxs = nativeTxsRes.map((t) => ({
      hash: t.hash,
      type: (t.from?.toLowerCase() === addrLower ? 'send' : 'receive') as 'send' | 'receive',
      from: t.from ?? '', to: t.to ?? '',
      valueNative: (Number(BigInt(t.value || '0x0')) / 1e18).toFixed(6),
      symbol: 'ETH',
      timestamp: blockTimestamps[t.blockNumber] || 0,
      isError: false, isToken: false, functionName: t.input === '0x' ? '' : 'contract call',
    }))

    // Deduplicate by hash using Set (O(n) instead of O(n²) with findIndex)
    const seenHashes = new Set<string>()
    const all = [...nativeTxs, ...erc20Txs]
      .filter((t) => {
        if (seenHashes.has(t.hash)) return false
        seenHashes.add(t.hash)
        return true
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100)

    if (all.length > 0) {
      return NextResponse.json({ transactions: all, source: 'rpc' })
    }
  } catch (e) {
    log.error('transactions', 'rpc error', redactError(e))
  }

  return NextResponse.json({ transactions: [], source: 'empty' })
}

// Fetch native ETH transactions by scanning recent block receipts
interface NativeTx {
  hash:         string
  from?:        string
  to?:          string
  value?:       string
  input?:       string
  blockNumber:  string
}
async function fetchNativeTxs(addrLower: string, fromBlockHex: string, latestBlock: number): Promise<NativeTx[]> {
  try {
    const from = parseInt(fromBlockHex, 16)
    const total = latestBlock - from
    const step  = Math.max(1, Math.floor(total / 50))
    const blockNums: number[] = []
    for (let b = latestBlock; b >= from && blockNums.length < 50; b -= step) {
      blockNums.push(b)
    }

    const results: NativeTx[] = []
    await Promise.all(blockNums.map(async (bn) => {
      try {
        const block = await fetch(RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBlockByNumber', params: ['0x' + bn.toString(16), true], id: bn }),
          cache: 'no-store',
          signal: AbortSignal.timeout(TIMEOUT.FAST),
        }).then(r => r.json())

        const txs: NativeTx[] = block?.result?.transactions ?? []
        for (const tx of txs) {
          if (
            tx.value && tx.value !== '0x0' &&
            (tx.from?.toLowerCase() === addrLower || tx.to?.toLowerCase() === addrLower)
          ) {
            results.push({ ...tx, blockNumber: block.result.number })
          }
        }
      } catch { /* skip block */ }
    }))

    return results
  } catch {
    return []
  }
}
